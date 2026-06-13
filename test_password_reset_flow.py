"""
Automated Password Reset Flow Test

Tests the full flow: register -> login -> forgot password (OTP via email)
-> reset password -> login with new password.

Usage:
    python test_password_reset_flow.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nobanno.settings')

import django
from django.test.utils import setup_test_environment, teardown_test_environment
from django.core import mail
from django.core.management import call_command

os.environ['DJANGO_ALLOW_ASYNC_UNSAFE'] = 'true'
django.setup()

# Create the database schema
call_command('migrate', verbosity=0)

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


def run_tests():
    setup_test_environment()

    # Use locmem email backend to capture emails in memory
    from django.conf import settings
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    # Clear any stale outbox
    mail.outbox = []

    client = APIClient()
    register_url = '/api/auth/register/'
    login_url = '/api/auth/login/'
    forgot_password_url = '/api/auth/forgot-password/'
    reset_password_url = '/api/auth/reset-password/'

    user_data = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "OldPassword123",
        "role": "customer",
        "name": "Test User",
    }

    passed = 0
    failed = 0

    def check(condition, label):
        nonlocal passed, failed
        if condition:
            print(f"  PASS: {label}")
            passed += 1
        else:
            print(f"  FAIL: {label}")
            failed += 1

    print("=" * 60)
    print("PASSWORD RESET FLOW TEST")
    print("=" * 60)

    # 1. Register a new user
    print("\n[1] Register a new user")
    resp = client.post(register_url, user_data, format='json')
    check(resp.status_code == 201, f"Register returns 201 (got {resp.status_code})")
    check('token' in resp.data, "Token returned on register")

    old_token = resp.data['token']
    user_id = resp.data['user']['id']
    print(f"    User ID: {user_id}, Token: {old_token[:10]}...")

    # 2. Login with the registered user
    print("\n[2] Login with registered user")
    resp = client.post(login_url, {
        "username": user_data['username'],
        "password": user_data['password'],
    }, format='json')
    check(resp.status_code == 200, f"Login returns 200 (got {resp.status_code})")
    check(resp.data['token'] == old_token, "Same token returned on login")

    # 3. Request forgot password (OTP via email)
    print("\n[3] Request password reset OTP")
    resp = client.post(forgot_password_url, {
        "email": user_data['email'],
        "method": "email",
    }, format='json')
    check(resp.status_code == 200, f"Forgot password returns 200 (got {resp.status_code})")
    check('OTP has been sent' in resp.data['message'], "Success message confirms OTP sent")

    # 4. Verify OTP was captured and extract it
    print("\n[4] Extract OTP from email")
    check(len(mail.outbox) == 1, f"1 email sent (got {len(mail.outbox)})")

    email_body = mail.outbox[0].body
    otp_code = None
    for line in email_body.split('\n'):
        line = line.strip()
        if 'Your OTP for password reset is:' in line:
            otp_code = line.split(': ')[-1].strip()
            break

    check(otp_code is not None, "OTP code found in email body")
    check(len(otp_code) == 6, f"OTP is 6 digits (got {len(otp_code)})")
    print(f"    OTP: {otp_code}")

    # 5. Reset password with OTP
    print("\n[5] Reset password with valid OTP")
    new_password = "NewSecurePassword456"
    resp = client.post(reset_password_url, {
        "email": user_data['email'],
        "otp": otp_code,
        "new_password": new_password,
    }, format='json')
    check(resp.status_code == 200, f"Reset password returns 200 (got {resp.status_code})")
    check('Password has been reset' in resp.data['message'], "Success message confirms reset")

    # 6. Login with old password SHOULD FAIL
    print("\n[6] Login with OLD password (should fail)")
    resp = client.post(login_url, {
        "username": user_data['username'],
        "password": user_data['password'],
    }, format='json')
    check(resp.status_code == 400, f"Old password login returns 400 (got {resp.status_code})")

    # 7. Login with NEW password SHOULD SUCCEED
    print("\n[7] Login with NEW password (should succeed)")
    resp = client.post(login_url, {
        "username": user_data['username'],
        "password": new_password,
    }, format='json')
    check(resp.status_code == 200, f"New password login returns 200 (got {resp.status_code})")
    check('token' in resp.data, "New token returned")
    check(resp.data['token'] != old_token, "New token is different from old token")

    # 8. Error case: non-existent email
    print("\n[8] Error case: forgot password with non-existent email")
    resp = client.post(forgot_password_url, {
        "email": "nobody@example.com",
    }, format='json')
    check(resp.status_code == 400, f"Returns 400 (got {resp.status_code})")
    check('No user found' in str(resp.data), "Error mentions no user found")

    # 9. Error case: invalid OTP
    print("\n[9] Error case: reset password with wrong OTP")
    resp = client.post(reset_password_url, {
        "email": user_data['email'],
        "otp": "000000",
        "new_password": "Whatever123",
    }, format='json')
    check(resp.status_code == 400, f"Returns 400 (got {resp.status_code})")
    check('Invalid OTP' in str(resp.data), "Error mentions invalid OTP")

    # 10. Error case: expired OTP
    print("\n[10] Error case: reset password with expired OTP")
    from datetime import timedelta
    from django.utils import timezone
    from api.models import OTP

    user = User.objects.get(email=user_data['email'])
    otp_record = OTP.objects.create(user=user, otp="654321", method='email')
    otp_record.created_at = timezone.now() - timedelta(minutes=10)
    otp_record.save(update_fields=['created_at'])

    resp = client.post(reset_password_url, {
        "email": user_data['email'],
        "otp": "654321",
        "new_password": "Whatever123",
    }, format='json')
    check(resp.status_code == 400, f"Returns 400 (got {resp.status_code})")
    check('expired' in str(resp.data).lower(), "Error mentions expired")

    # Summary
    print("\n" + "=" * 60)
    total = passed + failed
    print(f"RESULTS: {passed}/{total} passed, {failed}/{total} failed")

    teardown_test_environment()
    return failed == 0


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
