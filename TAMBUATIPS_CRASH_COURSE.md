# 🚀 The Deep-Dive: Building TambuaTips From Scratch

Welcome to the true core of TambuaTips. You found the previous guide too shallow, so we are going to dive straight into the *actual code powering this application*. 

By the end of this guide, you won't just understand analogies; you will understand **why specific lines of code exist** and how you can type them out yourself to recreate this platform.

---

## 📖 Chapter 1: The Master Blueprint

Before touching code, you must understand the architecture:
1. **Frontend (React + Vite + TypeScript)**: The visual buttons, text, and pages running in the user's browser.
2. **Backend (Python + FastAPI)**: The logic engine running on a server in the cloud. It calculates math, validates payments, and protects data.
3. **Database (MySQL + SQLAlchemy)**: The hard drive where we permanently store user accounts and money records.

When a user clicks "Buy", the **Frontend** sends a digital package over the internet. The **Backend** catches it, checks the **Database**, talks to M-Pesa, updates the **Database**, and sends a "Success" message back to the **Frontend**.

---

## 📖 Chapter 2: The Frontend Hub (React & Vite)

Let's go into the `tambuatips/` folder. Your first stop is always the `package.json` file.

### 1. `package.json` (The Recipe Book)
This file tells the computer what external coding libraries we are borrowing from the internet.
```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-router-dom": "^7.13.2",
    "tailwindcss": "^4.1.14"
  }
}
```
**Why it's there:** If you want to run this app, you open a terminal and type `npm install` (which reads this file and downloads everything) and then `npm run dev` (which executes the `dev` script above to start your website).

### 2. `src/main.tsx` (The Anchor)
In web development, you always have exactly one empty HTML file (`index.html`) with a blank box: `<div id="root"></div>`. 
`main.tsx` is the file that takes our React application and forces it inside that empty box.

### 3. `src/App.tsx` (The Traffic Cop)
Let's look at a critical snippet from `App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { FixturesPage } from './pages/FixturesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/fixtures" element={<FixturesPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```
**What does this do?** 
- `<BrowserRouter>` tells the browser we are turning it into a dynamic app.
- `<Route>` statements are the traffic cops. 
- **Line-by-line Logic:** When a user types `www.tambuatips.com/fixtures` into their browser, the traffic cop sees `/fixtures` and immediately loads the `<FixturesPage />` component on the screen.

---

## 📖 Chapter 3: The Backend Engine (FastAPI)

Now let's switch to the computer running in the cloud (the `backend/` folder).

### 1. `backend/app/main.py` (The Brain)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, payments

app = FastAPI(title="TambuaTips API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://tambuatips.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect Routers
app.include_router(auth.router)
app.include_router(payments.router)
```
**Deep Dive:**
- `app = FastAPI(...)`: This single line creates a massive, powerful web server.
- **CORS (Cross-Origin Resource Sharing)**: This is a strict security bouncer. By default, web browsers block your frontend website from secretly sending data to a random backend server. `CORSMiddleware` explicitly tells the browser: *"Hey, it is safe for `https://tambuatips.com` to talk to us."* Without this, your React app will fail to log users in!
- `app.include_router(...)`: Instead of having 10,000 lines of code in `main.py`, we split our code into smaller files (`auth.py`, `payments.py`) and plug them in here.

---

## 📖 Chapter 4: Database Logic (SQLAlchemy)

How do we actually save users? We use Python Classes to represent Database Tables.

```python
# A simplified example of backend/app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    is_admin = Column(Boolean, default=False)
```
**Why this matters:** When you write `user = User(email="test@test.com")` in python, SQLAlchemy automatically translates that into raw SQL (like `INSERT INTO users (email) VALUES ('test@test.com')`) and safely writes it to your hard drive. 
- `unique=True` ensures that your database will literally crash to protect itself if someone tries to register with an email that already exists.

---

## 📖 Chapter 5: The Authentication Flow (Line by Line)

Let's look at exactly how a Phone OTP login happens inside `backend/app/routers/auth.py`.

```python
@router.post("/phone/request-otp")
async def request_phone_otp(body: PhoneLoginRequest, db: AsyncSession = Depends(get_db)):
    phone = _normalize_phone(body.phone)
```
- `@router.post`: The address where the React frontend sends its data package.
- `async def`: "Asynchronous". This is crucial! It means while the server is waiting 2 seconds for the SMS text message to send to this user, the server can serve 500 other users simultaneously. Without `async`, your entire website would freeze for everybody while waiting!
- `Depends(get_db)`: Automatically connects to the MySQL database specifically for this single request.

```python
    # 1. Search the database for the phone number
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    # 2. Generate a 6-digit random code
    import random, string
    code = "".join(random.choices(string.digits, k=6))
    
    # 3. Save it to the database
    user.verification_code = code
    db.add(user)
    await db.commit()
```
**The Logic:**
1. We ask MySQL: `"Find the row in the User table where the phone matches."`
2. We use Python's random library to create `492019`.
3. We update that user's row in the database with the new code via `db.commit()`. Next time they click verify, we will check against this exact saved code.

---

## 📖 Chapter 6: Handling Real Money (M-Pesa Webhooks)

When you process real money, you cannot trust the Frontend, because a clever user could hack their own browser to tell the server "I paid." 

We use **Webhooks**. A webhook is a route on our backend designed for *Safaricom's servers* to call directly, bypassing the user completely. Look at `backend/app/routers/payments.py`:

```python
@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: AsyncSession = Depends(get_db)):
    # 1. Safaricom sends us a giant JSON package with the payment status
    data = await request.json()
    stk_callback = data.get("Body", {}).get("stkCallback", {})
    
    checkout_request_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")

    # 2. Find the pending payment, AND lock it
    result = await db.execute(
        select(Payment).where(Payment.transaction_id == checkout_request_id).with_for_update()
    )
    payment = result.scalar_one_or_none()
```
**The Genius Level Detail here is `.with_for_update()`:**
Imagine Safaricom accidentally calls your server twice in the exact same millisecond. Your server might fetch the payment, see it's unpaid, and run the code to grant the user 30 free days—*twice!* The user gets 60 days!
`.with_for_update()` is a "Row Lock." It tells MySQL: "*Lock this payment row so tightly that no other code snippet in the entire world can read it until I am completely finished updating it.*" This guarantees money calculations never double-count.

```python
    if result_code == 0:  # 0 means success in Safaricom logic
        payment.status = "completed"
        # We then run a function that upgrades their SubscriptionTier to VIP
        await _fulfill_payment(payment, user, db)

    await db.commit() # Save everything
```

---

## 📖 Chapter 7: Rebuilding it Yourself

If you are a beginner sitting at an empty computer, here is exactly how you build this app from scratch:

**Step 1: Construct the Backend Foundation**
1. Create a `main.py` file, initialize `app = FastAPI()`, and set up CORS.
2. Build your Database Models (`models/user.py`, `models/payment.py`) using `SQLAlchemy` so you have containers to hold your math and logic.
3. Build the `routers/auth.py` so users can get a system ID (Authentication token).
4. Build the `routers/payments.py` webhook so your system knows who has paid money.

**Step 2: Construct the Frontend Infrastructure**
1. Type `npm create vite@latest` to auto-generate `package.json`, `main.tsx`, and `App.tsx`.
2. Install `react-router-dom` to act as your Traffic Cop.
3. Install `tailwindcss` to avoid writing brutal, thousands-of-lines-long CSS graphical files.

**Step 3: Connect them**
1. In your React App, make an Axios function: 
   ```typescript
   axios.post('https://tambuatips.com/api/auth/phone/request-otp', { phone: "+25471234567" })
   ```
2. Create a shiny Green Button in React. When the user clicks the green button, it executes the code above.

You've now crossed the bridge. You understand CORS, Async logic, SQL Model Mapping, and Database Row-Locking for financial security. Welcome to Advanced Web Development!
