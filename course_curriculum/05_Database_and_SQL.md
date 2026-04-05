# Course 05: The Database and SQLAlchemy

Our Python kitchen is doing math, but it needs a place to permanently save it. 
If the power goes out on our server, any variables we saved in Python memory are wiped instantly. We need a solid-state hard drive: a **Relational Database** like MySQL.

## 1. The Relational Database: Excel on Steroids
Imagine a perfectly organized system of Excel spreadsheets. 
- You have a spreadsheet named `Users`. Rows represent people. Columns represent properties (`id`, `name`, `email`).
- You have a spreadsheet named `Payments`. Rows represent transactions.
- "Relational" means we connect them. A row in `Payments` might have a column called `user_id`. This points directly to a row in the `Users` sheet. Perfect linkage.

## 2. SQLAlchemy (The ORM Translator)
The Database only understands raw SQL code, which looks like this:
`SELECT * FROM Users WHERE email = 'qassim@test.com' AND is_admin = 1;`

Writing that by hand everywhere is annoying and prone to typos. Instead, we use an **ORM** (Object-Relational Mapper) called **SQLAlchemy**.
An ORM translates elegant Python code into raw SQL database code automatically!

**Step 1: defining the Tupperware (The Model)**
In `backend/app/models/user.py`, we define the exact shape of our data container so SQLAlchemy knows how to build the database columns.
```python
from sqlalchemy import Column, Integer, String

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    email = Column(String(50), unique=True)
```

**Step 2: Fetching data effortlessly**
Look at how easy querying becomes securely without writing raw SQL!
```python
# Raw SQL: SELECT * FROM users WHERE email='sam@test.com' LIMIT 1;

# Python SQLAlchemy version:
result = await db.execute(select(User).where(User.email == 'sam@test.com'))
sam_the_user = result.scalar_one_or_none()

print(sam_the_user.name) # Boom. We fetched his name from the hard drive.
```

## 3. Alembic (The Building Architect)
What happens 6 months from now if we decide our `User` needs a new column called `phone_number`? 
If you just add it to your Python code, your Database will crash because the raw hard drive doesn't have a column for it. You would usually have to delete the whole database and restart!

**Alembic** solves this. It is a migration tool. 
When you type the command `alembic revision --autogenerate`, Alembic looks at your Python code, looks at the Database, notices the difference, and writes a script that says: *"Okay, let's gently alter the live database table and slide this new `phone_number` column in without destroying anyone's saved data."*

## 4. Row Level Locking (How to NOT lose money)
Inside `tambuatips/backend/app/routers/payments.py` you will see `.with_for_update()`.
This is crucial.

Imagine Safaricom M-Pesa's servers glitch. Safaricom sends TWO webhook callbacks to your API at the exact same millisecond saying "Qassim paid $10!".
Because your server is fast, two separate threads process those two packets at the same time.
- Thread 1 checks database: Qassim's balance is $0.
- Thread 2 checks database: Qassim's balance is $0.
- Both add $10 ... and now Qassim has $20! A horrible bug.

`.with_for_update()` fixes this. 
```python
result = await db.execute(select(Payment).where(Payment.id == 5).with_for_update())
```
This tells MySQL: "Put a steel padlock on Row 5. Thread 1 gets the key. Thread 2 must literally wait in line until Thread 1 finishes processing before it's allowed to even look at the data." 
This guarantees the math is forever perfect.
