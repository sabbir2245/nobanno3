from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Sum
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta
import random


class ProductType(models.Model):
    name_en = models.CharField(max_length=100, unique=True)
    name_bn = models.CharField(max_length=100)
    max_price_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name_bn


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('farmer', 'Farmer'),
        ('customer', 'Customer'),
        ('deliveryman', 'Deliveryman'),
    )
    role = models.CharField(max_length=12, choices=ROLE_CHOICES, default='customer')
    name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True,)
    address = models.TextField(blank=True, null=True)
    email = models.EmailField(unique=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    average_rating = models.FloatField(null=True, blank=True, default=None)
    ratings_count = models.IntegerField(default=0)
    # Deliveryman service areas (JSON list of area IDs or descriptions)
    service_areas = models.JSONField(null=True, blank=True, default=list)
    # Structured location hierarchy for farmers/customers
    division = models.CharField(max_length=100, blank=True, default='')
    district = models.CharField(max_length=100, blank=True, default='')
    upazila = models.CharField(max_length=100, blank=True, default='')
    union = models.CharField(max_length=100, blank=True, default='')

    @property
    def total_sales(self):
        if self.role != 'farmer':
            return None
        from django.apps import apps
        OrderModel = apps.get_model('api', 'Order')
        return OrderModel.objects.filter(post__farmer=self, status='completed').aggregate(
            sum=Sum('total_paid')
        )['sum'] or 0.00

    def __str__(self):
        return f"{self.username} ({self.role})"


class Post(models.Model):
    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts', limit_choices_to={'role': 'farmer'})
    product_type = models.ForeignKey(ProductType, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    total_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2)
    latitude = models.FloatField()
    longitude = models.FloatField()
    # Collection point location hierarchy
    collection_district = models.CharField(max_length=100, blank=True, default='')
    collection_upazila = models.CharField(max_length=100, blank=True, default='')
    collection_union = models.CharField(max_length=100, blank=True, default='')
    collection_ward = models.CharField(max_length=100, blank=True, default='')
    collection_point_address = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_price(self):
        return round(self.total_weight_kg * self.price_per_kg, 2)

    def __str__(self):
        return f"{self.title} - {self.total_weight_kg}kg by {self.farmer.username}"


class PostImage(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('shipped', 'Shipped'),
        ('assigned', 'Assigned'),
        ('out_for_delivery', 'Out for Delivery'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', limit_choices_to={'role': 'customer'})
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='orders')
    deliveryman = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_paid = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)
    farmer_payout = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_address = models.TextField()
    # bKash payment fields on the order
    bkash_payment_id = models.CharField(max_length=100, null=True, blank=True)
    bkash_trx_id = models.CharField(max_length=100, null=True, blank=True)
    bkash_payment_status = models.CharField(max_length=20, null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    # Delivery tracking
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} for {self.post.title} ({self.status})"


class Review(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_reviews', limit_choices_to={'role': 'customer'})
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('customer', 'post')
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.customer.username} on {self.post.title} - {self.rating} stars"


class ReviewImage(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='review_images/', blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)


class OTP(models.Model):
    METHOD_CHOICES = (
        ('email', 'Email'),
        ('sms', 'SMS'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp = models.CharField(max_length=6)
    method = models.CharField(max_length=10, choices=METHOD_CHOICES, default='email')
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)

    def __str__(self):
        return f"OTP {self.otp} for {self.user.username} ({self.method})"


class Payment(models.Model):
    STATUS_CHOICES = (
        ('initiated', 'Initiated'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )
    PAYMENT_GATEWAY_CHOICES = (
        ('sslcommerz', 'SSLCommerz'),
        ('bkash', 'bKash'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    gateway = models.CharField(max_length=20, choices=PAYMENT_GATEWAY_CHOICES, default='bkash')
    gateway_response = models.JSONField(null=True, blank=True)
    # bKash specific fields
    bkash_payment_id = models.CharField(max_length=100, null=True, blank=True)
    bkash_trx_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.transaction_id} - {self.status} ({self.amount} BDT)"


class FarmerBankAccount(models.Model):
    ACCOUNT_TYPE_CHOICES = (
        ('savings', 'Savings'),
        ('current', 'Current'),
    )
    farmer = models.OneToOneField(User, on_delete=models.CASCADE, related_name='bank_account', limit_choices_to={'role': 'farmer'})
    bank_name = models.CharField(max_length=200)
    branch_name = models.CharField(max_length=200)
    routing_number = models.CharField(max_length=20)
    account_number = models.CharField(max_length=50)
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES, default='savings')
    mobile_number = models.CharField(max_length=15)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.farmer.name} - {self.bank_name} ({self.account_number})"


class BangladeshLocation(models.Model):
    LEVEL_CHOICES = (
        ('division', 'Division'),
        ('district', 'District'),
        ('upazila', 'Upazila'),
        ('union', 'Union'),
        ('ward', 'Ward'),
    )
    name_en = models.CharField(max_length=200)
    name_bn = models.CharField(max_length=200)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name_en']

    def __str__(self):
        return f"{self.name_en} ({self.get_level_display()})"