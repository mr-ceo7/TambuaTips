# Course 06: Building TambuaTips (Connecting the Dots)

You've learned the theory, the tech, the languages, and the architecture. 
Now, let's look at exactly how they connect to power **TambuaTips**, a premium sports betting tip platform.

Let's trace a real user flow: **A user viewing the Admin dashboard.**

## Phase 1: The Request (Frontend)
The user types `https://tambuatips.com/admin` in their browser.
1. The **React Router** (`App.tsx`) intercepts this, matches the URL, and loads the `DashboardPage.tsx` React component.
2. Inside `DashboardPage.tsx`, a React `useEffect` triggers the moment the page visibly loads.
3. This triggers a function in `src/services/admin.ts`.
4. Our **Axios Delivery Driver** attaches a secret magical wristband (the `access_token` JWT Cookie we got when we logged in earlier) and speeds across the internet to the cloud API endpoint: `GET /api/admin/stats`.

## Phase 2: The Gateway (Backend FastAPI)
The delivery driver knocks on the cloud server located at `backend/app/main.py`.
1. The incredibly fast **FastAPI framework** accepts the knock.
2. It sees the driver is looking for `/api/admin/stats`. Looking at its routing table, it forwards the request into `backend/app/routers/admin.py`.

## Phase 3: The Bouncer (Security)
In `admin.py`, the python function looks like this:
```python
@router.get("/stats")
async def get_dashboard_stats(user: User = Depends(get_current_admin_user), db: AsyncSession = Depends(get_db)):
```
1. Before running the code, FastAPI pauses. The `Depends()` function tells the security bouncer to jump in.
2. The bouncer (`security.py`) grabs the JWT wristband. It decrypts it mathematically. It verifies the user's ID is legit.
3. The bouncer checks the Database mapping for that User. It reads `is_admin = True`. 
4. The bouncer steps aside and legally allows the function to execute. (If the user was standard, it would throw a nasty HTTP 403 Forbidden error immediately back to the React UI).

## Phase 4: The Preparation (Database & Logic)
The chef function is now legally executing.
1. The Python chef uses `SQLAlchemy` to ask the permanent MySQL hard drive for several pieces of data cleanly.
```python
# Fetch basic counts for the admin dashboard cards
total_users = await db.execute(select(func.count(User.id)))
total_tips = await db.execute(select(func.count(Tip.id)))

# It packages this into a clean JSON dictionary response
return {
    "users": total_users.scalar(),
    "tips": total_tips.scalar()
}
```

## Phase 5: The Completion
1. The Axios driver takes that clean JSON package and drives furiously back to the user's web browser.
2. The `DashboardPage.tsx` React component receives the JSON object.
3. It saves the object into its short-term memory using React `useState()`.
4. React detects a state change, immediately redraws the screen, and beautifully maps the raw data into gorgeous visual charts via **Tailwind CSS**.

### Conclusion
You are no longer a beginner. You understand how thousands of lines of code break apart cleanly into specialized jobs across servers. 

If you want to build a new feature, you:
1. Write the Database Model (The Tupperware).
2. Write the API Route (The Chef logic).
3. Write the React Component (The UI).
4. Connect them via Axios. 

**Welcome to Fullstack Engineering.**
