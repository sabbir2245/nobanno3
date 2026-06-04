from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from api.models import Post, Order, Review
from rest_framework.authtoken.models import Token

User = get_user_model()

class NobannoAPITests(APITestCase):

    def setUp(self):
        # Create common test users
        self.farmer = User.objects.create_user(
            username="test_farmer",
            password="farmerpassword",
            role="farmer",
            name="Farmer Test",
            latitude=24.0,
            longitude=90.0,
            is_verified=True
        )
        self.farmer_token = Token.objects.create(user=self.farmer)

        self.customer = User.objects.create_user(
            username="test_customer",
            password="customerpassword",
            role="customer",
            name="Customer Test",
            balance=5000.00,
            latitude=24.05,
            longitude=90.05,
            is_verified=True
        )
        self.customer_token = Token.objects.create(user=self.customer)

        self.admin = User.objects.create_superuser(
            username="test_admin",
            password="adminpassword",
            role="admin",
            name="Admin Test",
            is_verified=True
        )
        self.admin_token = Token.objects.create(user=self.admin)

        # Create a sample listing (Post) by farmer
        self.post = Post.objects.create(
            farmer=self.farmer,
            title="Fresh Rice",
            description="Organic Rice",
            total_weight_kg=500.00,
            price_per_kg=50.00,
            latitude=24.0,
            longitude=90.0
        )

    def test_user_registration(self):
        url = reverse('auth-register')
        data = {
            "username": "new_farmer",
            "password": "newpassword123",
            "email": "new_farmer@test.com",
            "role": "farmer",
            "name": "New Farmer",
            "phone_number": "01799999999",
            "latitude": 24.1,
            "longitude": 90.1
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['role'], 'farmer')
        self.assertEqual(response.data['user']['username'], 'new_farmer')

    def test_user_login(self):
        url = reverse('auth-login')
        data = {
            "username": "test_customer",
            "password": "customerpassword"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['role'], 'customer')

    def test_create_post_farmer_only(self):
        url = reverse('posts-list')
        data = {
            "title": "Fresh Wheat",
            "description": "Golden wheat",
            "total_weight_kg": 200.00,
            "price_per_kg": 40.00,
            "latitude": 24.0,
            "longitude": 90.0
        }
        
        # Test guest access denied for posting
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test customer access denied for posting (IsFarmer permission)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.customer_token.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test farmer access granted
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.farmer_token.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 2)
        self.assertEqual(response.data['title'], "Fresh Wheat")
        self.assertEqual(response.data['farmer_username'], "test_farmer")

    def test_geo_location_search(self):
        # Create another post far away (Bogura: ~120km away from 24.0, 90.0)
        Post.objects.create(
            farmer=self.farmer,
            title="Far Away Potatoes",
            description="Bogura Potatoes",
            total_weight_kg=100.00,
            price_per_kg=30.00,
            latitude=24.84,
            longitude=89.37
        )

        url = reverse('posts-list')
        
        # Query near the first post (radius 15km)
        response = self.client.get(url, {"lat": 24.0, "lng": 90.0, "radius": 15}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return the first post "Fresh Rice" (distance ~0km)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Fresh Rice")
        self.assertIn('distance_km', response.data[0])

        # Query with large radius (150km)
        response = self.client.get(url, {"lat": 24.0, "lng": 90.0, "radius": 150}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return both posts
        self.assertEqual(len(response.data), 2)

    def test_order_creation_and_transaction(self):
        url = reverse('orders-list')
        data = {
            "post": self.post.id,
            "quantity_kg": 10.00,
            "delivery_address": "Test Banani Road"
        }

        # Setup Auth headers for customer
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.customer_token.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check customer balance deducted: 5000 - (10 * 50) = 4500
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.balance, 4500.00)

        # Check post stock deducted: 500 - 10 = 490
        self.post.refresh_from_db()
        self.assertEqual(self.post.total_weight_kg, 490.00)

        # Check fee calculations
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.total_paid, 500.00)
        self.assertEqual(order.platform_fee, 50.00)      # 10%
        self.assertEqual(order.farmer_payout, 450.00)    # 90%

    def test_insufficient_stock_fails(self):
        url = reverse('orders-list')
        data = {
            "post": self.post.id,
            "quantity_kg": 600.00, # Only 500 available
            "delivery_address": "Test Banani Road"
        }
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.customer_token.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity_kg", response.data)

    def test_insufficient_balance_fails(self):
        # Lower customer balance
        self.customer.balance = 100.00
        self.customer.save()

        url = reverse('orders-list')
        data = {
            "post": self.post.id,
            "quantity_kg": 10.00, # Cost: 10 * 50 = 500
            "delivery_address": "Test Banani Road"
        }
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.customer_token.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)

    def test_order_completion_and_payout(self):
        # Create an order
        order = Order.objects.create(
            customer=self.customer,
            post=self.post,
            quantity_kg=10.00,
            total_paid=500.00,
            platform_fee=50.00,
            farmer_payout=450.00,
            delivery_address="Test Banani Road",
            status="pending"
        )

        url = reverse('orders-complete', args=[order.id])
        
        # Unauthorized check
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Farmer tries to complete (Forbidden - only customer or admin can complete)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.farmer_token.key)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Customer completes order
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.customer_token.key)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify order status is completed
        order.refresh_from_db()
        self.assertEqual(order.status, "completed")

        # Verify farmer balance has received the payout: 0 + 450 = 450
        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.balance, 450.00)

    def test_review_validation(self):
        url = reverse('reviews-list')
        data = {
            "farmer": self.farmer.id,
            "rating": 5,
            "comment": "Super crop!"
        }

        # Customer tries to review farmer without completed order
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.customer_token.key)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)

        # Create a completed order
        Order.objects.create(
            customer=self.customer,
            post=self.post,
            quantity_kg=10.00,
            total_paid=500.00,
            platform_fee=50.00,
            farmer_payout=450.00,
            delivery_address="Test Address",
            status="completed"
        )

        # Customer tries again - should succeed
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.count(), 1)

        # Check farmer's dynamic average rating
        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.avg_rating, 5.0)
