from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from .models import Payment

User = get_user_model()

MOCK_INIT_SUCCESS = {
    'status': 'SUCCESS',
    'GatewayPageURL': 'https://sandbox.sslcommerz.com/gwprocess/v4/abc123',
    'sessionkey': 'sk_test_123',
    'tran_id': 'NOB-1-20250727-ABCDEF',
}

MOCK_INIT_FAIL = {
    'status': 'FAILED',
    'failedreason': 'Store ID validation failed',
}

MOCK_VALID_VALID = {
    'status': 'VALID',
    'tran_id': 'NOB-1-20250727-ABCDEF',
    'val_id': 'val_123',
    'amount': '500.00',
    'currency': 'BDT',
    'card_type': 'VISA',
}

MOCK_VALID_INVALID = {
    'status': 'FAILED',
    'tran_id': 'NOB-1-20250727-ABCDEF',
    'error': 'Transaction not found',
}


class PaymentInitiateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/payments/initiate/'

        self.customer = User.objects.create_user(
            username='paycustomer',
            email='pay@test.com',
            password='testpass123',
            role='customer',
            name='Pay Customer',
            phone_number='01700000000',
        )
        self.token, _ = Token.objects.get_or_create(user=self.customer)

    @patch('api.payments._initiate_session')
    def test_initiate_payment_success(self, mock_init):
        mock_init.return_value = MOCK_INIT_SUCCESS

        response = self.client.post(
            self.url, {'amount': '500.00'}, format='json',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('gateway_url', response.data)
        self.assertEqual(response.data['gateway_url'], MOCK_INIT_SUCCESS['GatewayPageURL'])
        self.assertEqual(response.data['amount'], '500.00')
        self.assertIn('transaction_id', response.data)
        self.assertIn('payment_id', response.data)

        payment = Payment.objects.get(pk=response.data['payment_id'])
        self.assertEqual(payment.status, 'initiated')
        self.assertEqual(payment.amount, Decimal('500.00'))
        self.assertEqual(payment.user, self.customer)

    def test_initiate_payment_missing_amount(self):
        response = self.client.post(
            self.url, {}, format='json',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Amount is required', str(response.data))

    def test_initiate_payment_invalid_amount(self):
        response = self.client.post(
            self.url, {'amount': '-100'}, format='json',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_payment_zero_amount(self):
        response = self.client.post(
            self.url, {'amount': '0'}, format='json',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_payment_unauthenticated(self):
        response = self.client.post(
            self.url, {'amount': '500.00'}, format='json',
        )
        self.assertEqual(response.status_code, 401)

    @patch('api.payments._initiate_session')
    def test_initiate_payment_gateway_failure(self, mock_init):
        mock_init.return_value = MOCK_INIT_FAIL

        response = self.client.post(
            self.url, {'amount': '500.00'}, format='json',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 502)
        self.assertIn('Failed to initiate', str(response.data))

    @patch('api.payments._initiate_session')
    def test_initiate_payment_network_error(self, mock_init):
        from requests.exceptions import ConnectionError
        mock_init.side_effect = ConnectionError('Connection refused')

        response = self.client.post(
            self.url, {'amount': '500.00'}, format='json',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 502)
        self.assertIn('Failed to connect', str(response.data))


class PaymentIPNTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/payments/sslcommerz/ipn/'

        self.customer = User.objects.create_user(
            username='ipncustomer',
            email='ipn@test.com',
            password='testpass123',
            role='customer',
        )

        self.payment = Payment.objects.create(
            user=self.customer,
            amount=Decimal('500.00'),
            transaction_id='NOB-2-20250727-XYZ123',
            status='initiated',
        )

    @patch('api.payments._validate_session')
    def test_ipn_success_credits_wallet(self, mock_validate):
        mock_validate.return_value = MOCK_VALID_VALID

        response = self.client.post(self.url, {
            'tran_id': 'NOB-2-20250727-XYZ123',
            'val_id': 'val_123',
            'status': 'VALID',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), 'Payment validated')

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'success')

    @patch('api.payments._validate_session')
    def test_ipn_failed_does_not_credit(self, mock_validate):
        mock_validate.return_value = MOCK_VALID_INVALID

        response = self.client.post(self.url, {
            'tran_id': 'NOB-2-20250727-XYZ123',
            'val_id': 'val_456',
            'status': 'FAILED',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), 'Payment validation failed')

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'failed')

    def test_ipn_missing_tran_id(self):
        response = self.client.post(self.url, {
            'val_id': 'val_123',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_ipn_unknown_tran_id(self):
        response = self.client.post(self.url, {
            'tran_id': 'DOES_NOT_EXIST',
            'val_id': 'val_123',
        }, format='json')
        self.assertEqual(response.status_code, 404)

    @patch('api.payments._validate_session')
    def test_ipn_already_validated(self, mock_validate):
        self.payment.status = 'success'
        self.payment.save()

        response = self.client.post(self.url, {
            'tran_id': 'NOB-2-20250727-XYZ123',
            'val_id': 'val_123',
        }, format='json')
        self.assertEqual(response.content.decode(), 'Already validated')
        mock_validate.assert_not_called()


class PaymentStatusTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.customer = User.objects.create_user(
            username='statuscust',
            email='status@test.com',
            password='testpass123',
            role='customer',
        )
        self.token, _ = Token.objects.get_or_create(user=self.customer)

        self.payment = Payment.objects.create(
            user=self.customer,
            amount=Decimal('250.00'),
            transaction_id='STATUS-TEST-001',
            status='success',
        )

    def test_get_payment_status(self):
        response = self.client.get(
            f'/api/payments/status/STATUS-TEST-001/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['amount'], '250.00')

    def test_get_payment_status_not_found(self):
        response = self.client.get(
            f'/api/payments/status/DOES_NOT_EXIST/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 404)

    def test_get_payment_status_unauthorized(self):
        response = self.client.get('/api/payments/status/STATUS-TEST-001/')
        self.assertEqual(response.status_code, 401)

    def test_cannot_view_others_payment(self):
        other = User.objects.create_user(
            username='othercust',
            email='other@test.com',
            password='testpass123',
            role='customer',
        )
        Payment.objects.create(
            user=other,
            amount=Decimal('100.00'),
            transaction_id='OTHER-PAY-001',
            status='success',
        )
        response = self.client.get(
            '/api/payments/status/OTHER-PAY-001/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 404)


class PaymentCallbackTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_success_callback(self):
        response = self.client.post('/api/payments/sslcommerz/success/', {
            'tran_id': 'CB-TEST-001',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'success')

    def test_fail_callback(self):
        response = self.client.post('/api/payments/sslcommerz/fail/', {
            'tran_id': 'CB-TEST-002',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'failed')

    def test_cancel_callback(self):
        response = self.client.post('/api/payments/sslcommerz/cancel/', {
            'tran_id': 'CB-TEST-003',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'cancelled')

    def test_success_callback_updates_payment(self):
        cust = User.objects.create_user(
            username='cbcust',
            email='cb@test.com',
            password='testpass123',
            role='customer',
        )
        pmt = Payment.objects.create(
            user=cust, amount=Decimal('100.00'),
            transaction_id='CB-TEST-004', status='initiated',
        )
        self.client.post('/api/payments/sslcommerz/success/', {
            'tran_id': 'CB-TEST-004',
        }, format='json')
        pmt.refresh_from_db()
        self.assertEqual(pmt.status, 'success')
