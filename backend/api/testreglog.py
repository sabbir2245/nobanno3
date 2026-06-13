import json
import random
import requests

# URL Configurations
BASE_URL = "http://192.168.1.100:8000/api"  # Using your updated Tethering IP
REGISTER_URL = f"{BASE_URL}/auth/register/"
LOGIN_URL = f"{BASE_URL}/auth/login/"

# Helper function to generate clean test identities to avoid duplicate database collisions
def get_fresh_user_data():
    rand_id = random.randint(1000, 9999)
    return {
        "username": f"user_{rand_id}",
        "email": f"test_{rand_id}@example.com",
        "password": "SecurePassword123",
        "role": "customer",
        "name": f"Test User {rand_id}",
        "phone_number": f"0171{random.randint(1000000, 9999999)}",
        "address": "Dhaka, Bangladesh",
        "latitude": 23.8103,
        "longitude": 90.4125
    }

def run_tests():
    print("🚀 STARTING BACKEND AUTH FLOW TEST SUITE VIA REQUESTS...")
    print("=" * 60)

    # -------------------------------------------------------------------------
    # TEST 1: Successful Registration
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Registering a fresh user account...")
    user_data = get_fresh_user_data()
    
    res = requests.post(REGISTER_URL, json=user_data)
    if res.status_code == 201:
        print("✅ SUCCESS: Status 201 Created.")
        print(f"   Received Token: {res.json().get('token')}")
    else:
        print(f"❌ FAILED: Status {res.status_code}. Response: {res.text}")
        return

    # -------------------------------------------------------------------------
    # TEST 2: Duplicate Email Registration Fails
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Testing duplicate email validation rejection...")
    duplicate_email_data = get_fresh_user_data()
    duplicate_email_data["email"] = user_data["email"]  # Stealing email from Test 1

    res = requests.post(REGISTER_URL, json=duplicate_email_data)
    if res.status_code == 400:
        print("✅ SUCCESS: Status 400 Bad Request (Backend correctly rejected duplicate email).")
        print(f"   Errors: {res.json()}")
    else:
        print(f"❌ FAILED: Expected 400, got {res.status_code}. Response: {res.text}")

    # -------------------------------------------------------------------------
    # TEST 3: Duplicate Phone Registration Fails
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Testing duplicate phone number validation rejection...")
    duplicate_phone_data = get_fresh_user_data()
    duplicate_phone_data["phone_number"] = user_data["phone_number"]  # Stealing phone from Test 1

    res = requests.post(REGISTER_URL, json=duplicate_phone_data)
    if res.status_code == 400:
        print("✅ SUCCESS: Status 400 Bad Request (Backend correctly rejected duplicate phone).")
        print(f"   Errors: {res.json()}")
    else:
        print(f"❌ FAILED: Expected 400, got {res.status_code}. Response: {res.text}")

    # -------------------------------------------------------------------------
    # TEST 4: Login with Username
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Authenticating via standard Username...")
    payload = {
        "email_or_phone": user_data["username"],
        "password": user_data["password"]
    }
    res = requests.post(LOGIN_URL, json=payload)
    if res.status_code == 200 and "token" in res.json():
        print("✅ SUCCESS: Status 200 OK. Authenticated via Username.")
    else:
        print(f"❌ FAILED: Status {res.status_code}. Response: {res.text}")

    # -------------------------------------------------------------------------
    # TEST 5: Login with Email
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Authenticating via Email...")
    payload = {
        "email_or_phone": user_data["email"],
        "password": user_data["password"]
    }
    res = requests.post(LOGIN_URL, json=payload)
    if res.status_code == 200:
        print("✅ SUCCESS: Status 200 OK. Authenticated via Email.")
    else:
        print(f"❌ FAILED: Status {res.status_code}. Response: {res.text}")

    # -------------------------------------------------------------------------
    # TEST 6: Login with Phone Number
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Authenticating via Phone Number...")
    payload = {
        "email_or_phone": user_data["phone_number"],
        "password": user_data["password"]
    }
    res = requests.post(LOGIN_URL, json=payload)
    if res.status_code == 200:
        print("✅ SUCCESS: Status 200 OK. Authenticated via Phone Number.")
    else:
        print(f"❌ FAILED: Status {res.status_code}. Response: {res.text}")

    # -------------------------------------------------------------------------
    # TEST 7: Invalid Credentials Fail Cleanly
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Testing invalid credentials handling...")
    payload = {
        "email_or_phone": user_data["email"],
        "password": "WrongPasswordHere"
    }
    res = requests.post(LOGIN_URL, json=payload)
    if res.status_code == 400:
        print("✅ SUCCESS: Status 400 Bad Request. Server rejected bad password cleanly.")
        print(f"   Errors: {res.json()}")
    else:
        print(f"❌ FAILED: Expected 400, got {res.status_code}. Response: {res.text}")

    print("\n" + "=" * 60)
    print("🏁 ALL AUTHENTICATION FLOW CHECKS COMPLETE.")

if __name__ == "__main__":
    try:
        run_tests()
    except requests.exceptions.ConnectionError:
        print(f"\n❌ CONNECTION ERROR: Could not reach Django at {BASE_URL}.")
        print("   Make sure 'python manage.py runserver 0.0.0.0:8000' is running.")
        