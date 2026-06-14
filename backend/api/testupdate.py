from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import User, Post

class UserAndPostUpdateTests(APITestCase):

    def setUp(self):
        # 1. Create a Farmer User
        self.farmer = User.objects.create_user(
            username='farmer1',
            email='farmer1@example.com',
            password='password123',
            role='farmer'
        )
        
        # 2. Create another User (Customer) to test unauthorized access
        self.customer = User.objects.create_user(
            username='customer1',
            email='customer1@example.com',
            password='password123',
            role='customer'
        )

        # 3. Create a Post owned by the farmer
        self.post = Post.objects.create(
            farmer=self.farmer,
            title="Fresh Organic Apples",
            description="Sweet and crisp",
            total_weight_kg=150.00,
            price_per_kg=3.50,
            latitude=23.8103,
            longitude=90.4125
        )

        # Reverse the URLs
        self.profile_url = reverse('profile-update')
        self.post_url = reverse('post-update', kwargs={'pk': self.post.pk})

    # =========================================================================
    # USER UPDATE TESTS
    # =========================================================================

    def test_update_user_profile_success(self):
        """Test that an authenticated user can update their own profile info."""
        self.client.force_authenticate(user=self.farmer)
        
        data = {
            "name": "Updated Farmer Name",
            "phone_number": "+123456789",
            "email": "farmer1@example.com" # Keeping the same email
        }
        
        response = self.client.patch(self.profile_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.name, "Updated Farmer Name")
        self.assertEqual(self.farmer.phone_number, "+123456789")

    def test_update_user_profile_unauthenticated(self):
        """Test that unauthenticated requests to the profile endpoint are blocked."""
        data = {"name": "New Name"}
        response = self.client.patch(self.profile_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_update_protected_fields(self):
        """Test that sensitive fields like balance and role cannot be changed via the API."""
        self.client.force_authenticate(user=self.farmer)
        
        data = {
            "balance": 5000.00,
            "role": "admin"
        }
        
        self.client.patch(self.profile_url, data, format='json')
        self.farmer.refresh_from_db()
        
        # Values should remain unchanged
        self.assertEqual(float(self.farmer.balance), 0.00)
        self.assertEqual(self.farmer.role, "farmer")


    # =========================================================================
    # POST UPDATE TESTS
    # =========================================================================

    def test_update_post_by_owner_success(self):
        """Test that the farmer who owns the post can successfully update it."""
        self.client.force_authenticate(user=self.farmer)
        
        data = {
            "title": "Premium Organic Apples",
            "price_per_kg": 4.00
        }
        
        response = self.client.patch(self.post_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.post.refresh_from_db()
        self.assertEqual(self.post.title, "Premium Organic Apples")
        self.assertEqual(float(self.post.price_per_kg), 4.00)

    def test_update_post_by_non_owner_fails(self):
        """Test that a user who does not own the post cannot update it."""
        # Authenticate as the customer, NOT the farmer who owns the post
        self.client.force_authenticate(user=self.customer)
        
        data = {
            "title": "Hacked Title"
        }
        
        response = self.client.patch(self.post_url, data, format='json')
        
        # Should return 403 Forbidden because of our custom validation check
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify database wasn't modified
        self.post.refresh_from_db()
        self.assertNotEqual(self.post.title, "Hacked Title")

    def test_delete_post_by_owner(self):
        """Test that the post can be deleted via the same endpoint."""
        self.client.force_authenticate(user=self.farmer)
        
        response = self.client.delete(self.post_url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Post.objects.filter(pk=self.post.pk).count(), 0)