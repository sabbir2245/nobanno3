from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from .models import Post, ProductType

User = get_user_model()


class BulkOrderAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.bulk_url = '/api/orders/bulk_create/'

        # Create a customer
        self.customer = User.objects.create_user(
            username='testcustomer',
            email='customer@test.com',
            password='testpass123',
            role='customer',
            name='Test Customer',
            address='123 Test St, Dhaka',
        )
        self.customer_token, _ = Token.objects.get_or_create(user=self.customer)

        # Create a farmer
        self.farmer = User.objects.create_user(
            username='testfarmer',
            email='farmer@test.com',
            password='testpass123',
            role='farmer',
            name='Test Farmer',
        )

        # Create product type
        self.product_type = ProductType.objects.create(
            name_en='Test Type',
            name_bn='পরীক্ষা',
        )

        # Create posts
        self.post1 = Post.objects.create(
            farmer=self.farmer,
            title='Test Potato',
            total_weight_kg=Decimal('100.00'),
            price_per_kg=Decimal('30.00'),
            latitude=23.81,
            longitude=90.41,
            product_type=self.product_type,
        )
        self.post2 = Post.objects.create(
            farmer=self.farmer,
            title='Test Rice',
            total_weight_kg=Decimal('200.00'),
            price_per_kg=Decimal('55.00'),
            latitude=23.81,
            longitude=90.41,
            product_type=self.product_type,
        )

    def test_bulk_create_orders_success(self):
        payload = {
            'items': [
                {'post': self.post1.id, 'quantity_kg': '10.00'},
                {'post': self.post2.id, 'quantity_kg': '5.00'},
            ],
            'delivery_address': '456 Test Ave, Dhaka',
        }
        response = self.client.post(
            self.bulk_url, payload, format='json',
            HTTP_AUTHORIZATION=f'Token {self.customer_token.key}',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 2)

        # Verify stock deductions
        self.post1.refresh_from_db()
        self.post2.refresh_from_db()
        self.assertEqual(self.post1.total_weight_kg, Decimal('90.00'))
        self.assertEqual(self.post2.total_weight_kg, Decimal('195.00'))

        # Verify order details
        order1 = response.data[0]
        order2 = response.data[1]
        self.assertEqual(order1['status'], 'pending')
        self.assertEqual(order1['delivery_address'], '456 Test Ave, Dhaka')
        self.assertEqual(order1['post_title'], 'Test Potato')
        self.assertEqual(order2['post_title'], 'Test Rice')

        # Verify platform fee and farmer payout
        self.assertEqual(Decimal(order1['platform_fee']), Decimal('30.00'))  # 10% of 300
        self.assertEqual(Decimal(order1['farmer_payout']), Decimal('270.00'))  # 90% of 300
        self.assertEqual(Decimal(order1['total_paid']), Decimal('300.00'))

    def test_bulk_create_insufficient_stock(self):
        payload = {
            'items': [
                {'post': self.post1.id, 'quantity_kg': '999.00'},
            ],
            'delivery_address': '456 Test Ave, Dhaka',
        }
        response = self.client.post(
            self.bulk_url, payload, format='json',
            HTTP_AUTHORIZATION=f'Token {self.customer_token.key}',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Insufficient stock', str(response.data))

    def test_bulk_create_unauthenticated(self):
        payload = {
            'items': [{'post': self.post1.id, 'quantity_kg': '10.00'}],
            'delivery_address': '456 Test Ave, Dhaka',
        }
        response = self.client.post(self.bulk_url, payload, format='json')
        self.assertEqual(response.status_code, 401)

    def test_bulk_create_farmer_cannot_order(self):
        farmer_token, _ = Token.objects.get_or_create(user=self.farmer)
        payload = {
            'items': [{'post': self.post1.id, 'quantity_kg': '10.00'}],
            'delivery_address': '456 Test Ave, Dhaka',
        }
        response = self.client.post(
            self.bulk_url, payload, format='json',
            HTTP_AUTHORIZATION=f'Token {farmer_token.key}',
        )
        self.assertEqual(response.status_code, 403)

    def test_bulk_create_empty_items(self):
        payload = {
            'items': [],
            'delivery_address': '456 Test Ave, Dhaka',
        }
        response = self.client.post(
            self.bulk_url, payload, format='json',
            HTTP_AUTHORIZATION=f'Token {self.customer_token.key}',
        )
        self.assertEqual(response.status_code, 400)

    def test_bulk_create_nonexistent_post(self):
        payload = {
            'items': [{'post': 99999, 'quantity_kg': '10.00'}],
            'delivery_address': '456 Test Ave, Dhaka',
        }
        response = self.client.post(
            self.bulk_url, payload, format='json',
            HTTP_AUTHORIZATION=f'Token {self.customer_token.key}',
        )
        self.assertEqual(response.status_code, 400)
