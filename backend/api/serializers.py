from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Post, Order, Review, ReviewImage, OTP
from rest_framework.validators import UniqueValidator

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    avg_rating = serializers.FloatField(source='average_rating', read_only=True, allow_null=True)
    total_sales = serializers.ReadOnlyField()
    ratings_count = serializers.IntegerField(read_only=True)
    
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all(), message="A user with this email already exists.")]
    )
    phone_number = serializers.CharField(
        validators=[UniqueValidator(queryset=User.objects.all(), message="A user with this phone number already exists.")]
    )

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'role', 'name', 
            'phone_number', 'address', 'balance', 
            'latitude', 'longitude', 'is_verified',
            'avg_rating', 'ratings_count', 'total_sales'
        )
        read_only_fields = ('balance', 'is_verified', 'avg_rating', 'ratings_count', 'total_sales')

# In your serializers.py
class EmailOrPhoneAuthSerializer(serializers.Serializer):
    email_or_phone = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs.get('email_or_phone')
        password = attrs.get('password')

        if identifier and password:
            # We pass 'identifier' to Django's username parameter. 
            # Our custom EmailOrPhoneBackend will intercept it.
            from django.contrib.auth import authenticate
            user = authenticate(request=self.context.get('request'),
                                username=identifier, password=password)

            if not user:
                raise serializers.ValidationError('Unable to log in with provided credentials.')
        else:
            raise serializers.ValidationError('Must include "email_or_phone" and "password".')

        attrs['user'] = user
        return attrs
    
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    # CRITICAL: Enforce uniqueness during registration so the API handles duplicates gracefully (400 Bad Request)
    email = serializers.EmailField(
        required=True, # Make it required if it's a primary login option
        validators=[UniqueValidator(queryset=User.objects.all(), message="A user with this email already exists.")]
    )
    phone_number = serializers.CharField(
        required=True, # Make it required if it's a primary login option
        validators=[UniqueValidator(queryset=User.objects.all(), message="A user with this phone number already exists.")]
    )

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'role', 'name', 
            'phone_number', 'address', 'latitude', 'longitude'
        )

    def validate_role(self, value):
        if value not in ['farmer', 'customer']:
            raise serializers.ValidationError("Role must be 'farmer' or 'customer'.")
        return value

    def create(self, validated_data):
        # Extract the password separately because create_user handles hashing automatically
        password = validated_data.pop('password')
        
        # Cleaner approach: Pass the remaining dictionary data directly into create_user
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


#from rest_framework import serializers
#from .models import Post  # Adjust import based on your app structure

class PostSerializer(serializers.ModelSerializer):
    farmer_name = serializers.ReadOnlyField(source='farmer.name')
    farmer_username = serializers.ReadOnlyField(source='farmer.username')
    farmer_avg_rating = serializers.FloatField(source='farmer.average_rating', read_only=True, allow_null=True)
    farmer_ratings_count = serializers.IntegerField(source='farmer.ratings_count', read_only=True)
    total_price = serializers.SerializerMethodField()
    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = ('farmer',)
        
    def get_total_price(self, obj):
        return obj.total_price

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image:
            request = self.context.get('request')
            if request is not None:
                representation['image'] = request.build_absolute_uri(instance.image.url)
            else:
                representation['image'] = f"http://192.168.1.100:8000{instance.image.url}"
        return representation

    def validate_total_weight_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Weight must be greater than zero.")
        return value

    def validate_price_per_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value
    
    
    
class OrderSerializer(serializers.ModelSerializer):
    customer_username = serializers.ReadOnlyField(source='customer.username')
    customer_name = serializers.ReadOnlyField(source='customer.name')
    post_title = serializers.ReadOnlyField(source='post.title')
    post_farmer_name = serializers.ReadOnlyField(source='post.farmer.name')
    post_farmer_id = serializers.ReadOnlyField(source='post.farmer.id')

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('customer', 'total_paid', 'platform_fee', 'farmer_payout', 'status')

    def validate(self, attrs):
        post = attrs.get('post')
        quantity_kg = attrs.get('quantity_kg')
        customer = self.context['request'].user

        if quantity_kg <= 0:
            raise serializers.ValidationError({"quantity_kg": "Quantity must be greater than zero."})

        if post.total_weight_kg < quantity_kg:
            raise serializers.ValidationError(
                {"quantity_kg": f"Insufficient stock. Only {post.total_weight_kg}kg available."}
            )

        total_paid = quantity_kg * post.price_per_kg
        if customer.balance < total_paid:
            raise serializers.ValidationError(
                {"non_field_errors": f"Insufficient balance. Total cost is {total_paid}, but your balance is {customer.balance}."}
            )

        return attrs

    def create(self, validated_data):
        customer = self.context['request'].user
        post = validated_data['post']
        quantity_kg = validated_data['quantity_kg']

        with transaction.atomic():
            # select_for_update to lock the post row
            post = Post.objects.select_for_update().get(pk=post.pk)
            
            if post.total_weight_kg < quantity_kg:
                raise serializers.ValidationError(
                    {"quantity_kg": f"Insufficient stock. Only {post.total_weight_kg}kg available."}
                )

            total_paid = round(quantity_kg * post.price_per_kg, 2)
            
            # lock customer user row to verify balance
            customer = User.objects.select_for_update().get(pk=customer.pk)
            if customer.balance < total_paid:
                raise serializers.ValidationError(
                    {"non_field_errors": f"Insufficient balance. Total cost is {total_paid}, but your balance is {customer.balance}."}
                )

            # Deduct balance & stock
            customer.balance -= total_paid
            customer.save()

            post.total_weight_kg -= quantity_kg
            post.save()

            platform_fee = round(total_paid * Decimal('0.10'), 2)
            farmer_payout = total_paid - platform_fee

            order = Order.objects.create(
                customer=customer,
                post=post,
                quantity_kg=quantity_kg,
                total_paid=total_paid,
                platform_fee=platform_fee,
                farmer_payout=farmer_payout,
                delivery_address=validated_data['delivery_address'],
                status='pending'
            )
            return order


class ReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = ('id', 'image', 'image_url')


class ReviewSerializer(serializers.ModelSerializer):
    customer_username = serializers.ReadOnlyField(source='customer.username')
    customer_name = serializers.ReadOnlyField(source='customer.name')
    post_title = serializers.ReadOnlyField(source='post.title')
    farmer_username = serializers.ReadOnlyField(source='post.farmer.username')
    farmer_id = serializers.ReadOnlyField(source='post.farmer.id')
    images = ReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('customer',)

    def validate(self, attrs):
        customer = self.context['request'].user
        post = attrs.get('post')
        rating = attrs.get('rating')

        if rating < 1 or rating > 5:
            raise serializers.ValidationError({"rating": "Rating must be between 1 and 5."})

        # Check if customer has a completed order for this specific post
        has_completed_order = Order.objects.filter(
            customer=customer,
            post=post,
            status='completed'
        ).exists()

        if not has_completed_order:
            raise serializers.ValidationError(
                {"non_field_errors": "You can only review a product after completing a purchase for it."}
            )

        return attrs

