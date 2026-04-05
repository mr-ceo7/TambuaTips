# Course 04: Python & FastAPI (The Backend Engine)

The Axios delivery driver from the Frontend just arrived at the cloud server carrying a JSON package. He knocks on the door. Who answers?

**FastAPI**, written in **Python**.
FastAPI is exactly what it sounds like: a wildly fast tool for building Application Programming Interfaces (APIs). Think of an API as the drive-thru window of your restaurant.

## 1. Routes: The Different Drive-Thru Windows
You wouldn't have the same worker who takes payment also cooking the fries and unclogging the toilet simultaneously in a massive restaurant. You separate the jobs.

FastAPI uses **Routes**. You define specific URL paths (windows) that map to specific Python functions (chefs).

```python
from fastapi import FastAPI

app = FastAPI()

# Window 1: Getting Free Tips
@app.get("/tips/free")
def get_free_tips():
    return {"match": "Arsenal vs Chelsea", "prediction": "Draw"}

# Window 2: Processing Payments (Notice it's a POST verb now!)
@app.post("/payments/checkout")
def handle_payment():
    return {"status": "Success, we charged your card!"}
```
**Analogy:** The `@app.get` code block acts as a signpost above a door. It says, "If anyone from the internet comes looking for `/tips/free` using a GET request, immediately force them to talk to the `get_free_tips` function!"

## 2. Pydantic Models: The Bouncer
Remember how TypeScript forces strict type-checking on the Frontend? We need that on the Backend too. We cannot let a user send `{ "age": "banana" }` to our server, or our math will explode.

FastAPI uses **Pydantic Models** (which, in TambuaTips, live in `backend/app/schemas/`). They act as bouncers, validating the JSON sent by the frontend before it's allowed into the kitchen.

```python
from pydantic import BaseModel

class PaymentRequest(BaseModel):
    phone_number: str
    amount: int  # Must be a number!

@app.post("/pay")
def process_m_pesa(payload: PaymentRequest):
    # If the user sent letters instead of numbers for 'amount',
    # FastAPI will auto-reject the request with a 422 Error before this code ever runs!
    
    total = payload.amount * 2
    return {"message": "All good."}
```

## 3. Background Tasks
In your actual code (`backend/app/routers/auth.py`), you will see things called `background_tasks`.

**Analogy:** After placing an order, the cashier hands you a receipt immediately. The cashier *doesn't* make you wait at the register while they send an email notification to the manager. They send that email "in the background".

```python
from fastapi import BackgroundTasks

def send_welcome_email(email_address: str):
    # (Pretend sending an email takes 10 seconds of processing time)
    print(f"Email sent to {email_address}!")

@app.post("/register")
async def register_user(email: str, background_tasks: BackgroundTasks):
    
    # Offload the heavy work to the background squad!
    background_tasks.add_task(send_welcome_email, email)
    
    # Return Instantly! The user feels 0 delay.
    return {"status": "Account Created!"}
```

### Summary
In TambuaTips (`backend/app/routers`), you will find the actual specialized Chefs driving your app. `payments.py` acts as the cashier, `auth.py` acts as the Security ID Badge issuer, and `tips.py` acts as the sports analyst. Every request routed by FastAPI lands here to be validated and processed.
