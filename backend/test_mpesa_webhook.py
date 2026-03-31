import requests

print("Testing M-Pesa Webhook without secret...")
response = requests.post("http://localhost:8000/api/pay/mpesa/callback", json={
    "Body": {
        "stkCallback": {
            "CheckoutRequestID": "ws_CO_260520211133524545",
            "ResultCode": 0,
            "ResultDesc": "Success",
            "CallbackMetadata": {
                "Item": [{"Name": "MpesaReceiptNumber", "Value": "XYZ123"}]
            }
        }
    }
})

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 403:
    print("SUCCESS: Endpoint correctly rejected unauthorized request.")
else:
    print("FAILED: Endpoint allowed request or returned unexpected code.")
