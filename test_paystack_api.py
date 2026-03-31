import requests
import string
import random
import time

BASE_URL = "http://localhost:8000"
rand_str = ''.join(random.choices(string.ascii_lowercase, k=6))
email = f"test_{rand_str}@example.com"

print(f"1. Registering: {email}")
reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
    "name": f"Test User {rand_str}",
    "email": email,
    "password": "password123"
}, timeout=10)
print("Register Status:", reg_res.status_code)

print(f"2. Logging in")
login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": email,
    "password": "password123"
}, timeout=10)
print("Login Status:", login_res.status_code)

if login_res.status_code == 200:
    token = login_res.json()["access_token"]
    print("Got token")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "item_type": "subscription",
        "item_id": "premium",
        "duration_weeks": 2,
        "email": email
    }
    print(f"3. Calling Paystack endpoint via POST /api/pay/paystack")
    try:
        pay_res = requests.post(f"{BASE_URL}/api/pay/paystack", json=payload, headers=headers, timeout=15)
        print("Paystack Status:", pay_res.status_code)
        print("Paystack JSON:", pay_res.json())
    except Exception as e:
        print("Exception during paystack call:", e)
else:
    print("Failed to login", login_res.text)
