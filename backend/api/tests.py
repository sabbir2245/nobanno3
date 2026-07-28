from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from .models import Order, Post, ProductType

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


class DeliverymanDashboardAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.deliveryman = User.objects.create_user(
            username='deliveryman', email='deliveryman@test.com', password='testpass123',
            role='deliveryman', name='Test Deliveryman',
        )
        self.other_deliveryman = User.objects.create_user(
            username='otherdeliveryman', email='otherdeliveryman@test.com', password='testpass123',
            role='deliveryman', name='Other Deliveryman',
        )
        self.customer = User.objects.create_user(
            username='deliverycustomer', email='deliverycustomer@test.com', password='testpass123',
            role='customer', name='Delivery Customer', address='Dhaka',
        )
        self.farmer = User.objects.create_user(
            username='deliveryfarmer', email='deliveryfarmer@test.com', password='testpass123',
            role='farmer', name='Delivery Farmer',
        )
        product_type = ProductType.objects.create(name_en='Delivery Test Type', name_bn='ডেলিভারি পরীক্ষা')
        self.post = Post.objects.create(
            farmer=self.farmer, product_type=product_type, title='Delivery vegetables',
            total_weight_kg=Decimal('100.00'), price_per_kg=Decimal('30.00'),
            latitude=23.81, longitude=90.41,
        )
        self.token, _ = Token.objects.get_or_create(user=self.deliveryman)

    def make_order(self, status, deliveryman=None):
        return Order.objects.create(
            customer=self.customer, post=self.post, deliveryman=deliveryman,
            quantity_kg=Decimal('5.00'), status=status, total_paid=Decimal('150.00'),
            platform_fee=Decimal('15.00'), farmer_payout=Decimal('135.00'),
            delivery_address='Dhaka',
        )

    def dashboard(self, tab):
        return self.client.get(
            f'/api/deliveryman/dashboard/?tab={tab}',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )

    def test_available_and_my_deliveries_are_separate(self):
        available = self.make_order('shipped')
        mine = self.make_order('assigned', self.deliveryman)
        self.make_order('out_for_delivery', self.other_deliveryman)

        available_response = self.dashboard('available')
        my_response = self.dashboard('my-deliveries')

        self.assertEqual(available_response.status_code, 200)
        self.assertEqual([item['id'] for item in available_response.data['orders']], [available.id])
        self.assertEqual(my_response.status_code, 200)
        self.assertEqual([item['id'] for item in my_response.data['orders']], [mine.id])

    def test_accepted_order_moves_to_my_deliveries(self):
        order = self.make_order('shipped')

        accept_response = self.client.post(
            f'/api/orders/{order.id}/accept/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )

        self.assertEqual(accept_response.status_code, 200)
        self.assertEqual(self.dashboard('available').data['orders'], [])
        self.assertEqual([item['id'] for item in self.dashboard('my-deliveries').data['orders']], [order.id])
