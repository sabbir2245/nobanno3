from django.test import TestCase
from django.core import mail
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model

User = get_user_model()


class PasswordResetFlowTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.forgot_password_url = '/api/auth/forgot-password/'
        self.reset_password_url = '/api/auth/reset-password/'

        self.user_data = {
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "OldPassword123",
            "role": "customer",
            "name": "Test User",
        }

    def test_full_password_reset_flow(self):
        # 1. Register a new user
        reg_response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(reg_response.status_code, 201)
        self.assertIn('token', reg_response.data)
        self.assertEqual(reg_response.data['user']['email'], self.user_data['email'])
        old_token = reg_response.data['token']

        # 2. Login with the registered user
        login_response = self.client.post(self.login_url, {
            "username": self.user_data['username'],
            "password": self.user_data['password'],
        }, format='json')
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.data['token'], old_token)

        # 3. Request forgot password (OTP via email)
        forgot_response = self.client.post(self.forgot_password_url, {
            "email": self.user_data['email'],
            "method": "email",
        }, format='json')
        self.assertEqual(forgot_response.status_code, 200)
        self.assertIn('OTP has been sent', forgot_response.data['message'])

        # 4. Verify OTP was sent via email
        self.assertEqual(len(mail.outbox), 1)
        email_body = mail.outbox[0].body
        self.assertIn('Your OTP for password reset is:', email_body)

        # Extract OTP from email body
        otp_code = None
        for line in email_body.split('\n'):
            line = line.strip()
            if line.startswith('Your OTP for password reset is:'):
                otp_code = line.split(': ')[-1].strip()
                break
        self.assertIsNotNone(otp_code, "OTP code not found in email")
        self.assertEqual(len(otp_code), 6)

        # 5. Reset password with OTP
        new_password = "NewSecurePassword456"
        reset_response = self.client.post(self.reset_password_url, {
            "email": self.user_data['email'],
            "otp": otp_code,
            "new_password": new_password,
        }, format='json')
        self.assertEqual(reset_response.status_code, 200)
        self.assertIn('Password has been reset', reset_response.data['message'])

        # 6. Attempt to login with old password (should fail)
        old_login_response = self.client.post(self.login_url, {
            "username": self.user_data['username'],
            "password": self.user_data['password'],
        }, format='json')
        self.assertEqual(old_login_response.status_code, 400)

        # 7. Login with new password (should succeed)
        new_login_response = self.client.post(self.login_url, {
            "username": self.user_data['username'],
            "password": new_password,
        }, format='json')
        self.assertEqual(new_login_response.status_code, 200)
        self.assertIn('token', new_login_response.data)
        self.assertNotEqual(new_login_response.data['token'], old_token)

    def test_forgot_password_nonexistent_email(self):
        response = self.client.post(self.forgot_password_url, {
            "email": "nonexistent@example.com",
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('No user found', str(response.data))

    def test_reset_password_invalid_otp(self):
        self.client.post(self.register_url, self.user_data, format='json')
        self.client.post(self.forgot_password_url, {
            "email": self.user_data['email'],
        }, format='json')

        response = self.client.post(self.reset_password_url, {
            "email": self.user_data['email'],
            "otp": "000000",
            "new_password": "NewPassword123",
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid OTP', str(response.data))

    def test_reset_password_expired_otp(self):
        self.client.post(self.register_url, self.user_data, format='json')

        from django.utils import timezone
        from datetime import timedelta
        from api.models import OTP

        user = User.objects.get(email=self.user_data['email'])
        otp_record = OTP.objects.create(user=user, otp="123456", method='email')
        otp_record.created_at = timezone.now() - timedelta(minutes=10)
        otp_record.save(update_fields=['created_at'])

        response = self.client.post(self.reset_password_url, {
            "email": self.user_data['email'],
            "otp": "123456",
            "new_password": "NewPassword123",
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('expired', str(response.data))
