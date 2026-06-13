from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Sum
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta
import random

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('farmer', 'Farmer'),
        ('customer', 'Customer'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='customer')
    name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True,)
    address = models.TextField(blank=True, null=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    email = models.EmailField(unique=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    @property
    def avg_rating(self):
        if self.role != 'farmer':
            return None
        reviews = self.received_reviews.all()
        if not reviews.exists():
            return 0.0
        return round(sum(r.rating for r in reviews) / len(reviews), 2)
    
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
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    total_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2)
    latitude = models.FloatField()
    longitude = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_price(self):
        return round(self.total_weight_kg * self.price_per_kg, 2)

    def __str__(self):
        return f"{self.title} - {self.total_weight_kg}kg by {self.farmer.username}"


class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('shipped', 'Shipped'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', limit_choices_to={'role': 'customer'})
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='orders')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    total_paid = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)  # 10%
    farmer_payout = models.DecimalField(max_digits=10, decimal_places=2)  # 90%
    delivery_address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} for {self.post.title} ({self.status})"


class Review(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_reviews', limit_choices_to={'role': 'customer'})
    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_reviews', limit_choices_to={'role': 'farmer'})
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    image = models.ImageField(upload_to='review_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('customer', 'farmer')

    def __str__(self):
        return f"Review by {self.customer.username} for {self.farmer.username} - {self.rating} stars"


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