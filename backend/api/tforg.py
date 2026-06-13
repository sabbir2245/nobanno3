import random
import string
import requests

# 1. Base API URL configuration
# Adjust the IP/Port to match your running server if testing via local network
BASE_URL = "http://127.0.0.1:8000/api" 

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def run_test_flow():
    # 2. Generate random user variables
   
    username = f"sapb"
    email = f"sabbirphoto29@gmail.com"  # ⚠️ Change this to your real test email to check your inbox!
    password = f"Old"
    
    # Random fields matching your RegisterSerializer
    registration_data = {
        "username": username,
        "email": email,
        "password": password,
        "role": random.choice(["farmer", "customer"]),
        "name": f"Lana Rhoades",
        "phone_number": f"+880171{random.randint(1000000, 9999999)}",
        "address": f"Dorm Room {random.randint(100, 400)}, University Area",
        "latitude": round(random.uniform(23.5, 24.5), 6),
        "longitude": round(random.uniform(89.5, 90.5), 6)
    }

    print("--- STEP 1: GENERATED TEST DATA ---")
    for key, val in registration_data.items():
        if "password" not in key:
            print(f"{key}: {val}")
    print("-" * 35)

    # 3. Call Register Endpoint
    register_url = f"{BASE_URL}/auth/register/"
    print(f"\nSending POST request to: {register_url}")
    
    try:
        reg_response = requests.post(register_url, json=registration_data)
        if reg_response.status_code == 201:
            print(f"✅ Registration Successful! Status Code: {reg_response.status_code}")
            print(f"Token Received: {reg_response.json().get('token')}")
        else:
            print(f"❌ Registration Failed! Status Code: {reg_response.status_code}")
            print(reg_response.text)
            return
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error: Is your Django server running at {BASE_URL}?")
        return

    # 4. Call Forgot Password Endpoint
    forgot_url = f"{BASE_URL}/auth/forgot-password/"
    print(f"\n--- STEP 2: REQUESTING PASSWORD RESET OPT ---")
    print(f"Sending POST request to: {forgot_url}")
    
    forgot_data = {
        "email": email,
        "method": "email"
    }
    
    forgot_response = requests.post(forgot_url, json=forgot_data)
    if forgot_response.status_code == 200:
        print(f"✅ OTP Triggered successfully! Backend response: {forgot_response.json().get('message')}")
    else:
        print(f"❌ Failed to request OTP. Status Code: {forgot_response.status_code}")
        print(forgot_response.text)
        return

    # 5. Terminal Interception for OTP Input
    print(f"\n--- STEP 3: TERMINAL CAPTURE ---")
    print(f"📨 Check the inbox for: {email}")
    otp_input = input("👉 Enter the 6-digit OTP code received in your email: ").strip()

    # 6. Call Reset Password Endpoint
    reset_url = f"{BASE_URL}/auth/reset-password/"
    new_secure_password = f"NewlyResetPass999_{generate_random_string(4)}"
    
    reset_data = {
        "email": email,
        "otp": otp_input,
        "new_password": new_secure_password
    }

    print(f"\n--- STEP 4: SUBMITTING NEW PASSWORD ---")
    print(f"Sending POST request to: {reset_url}")
    
    reset_response = requests.post(reset_url, json=reset_data)
    if reset_response.status_code == 200:
        print(f"🎉 SUCCESS! Password reset execution completed.")
        print(f"Backend Msg: {reset_response.json().get('message')}")
        print(f"\n🔑 Your updated login credentials:")
        print(f"Username: {username}")
        print(f"Email: {email}")
        print(f"New Password: {new_secure_password}")
    else:
        print(f"❌ Password Reset Failed! Status Code: {reset_response.status_code}")
        print(reset_response.text)

if __name__ == "__main__":
    run_test_flow()