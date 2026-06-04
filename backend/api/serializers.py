from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Post, Order, Review


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    avg_rating = serializers.ReadOnlyField()
    total_sales = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'role', 'name', 
            'phone_number', 'address', 'balance', 
            'latitude', 'longitude', 'is_verified',
            'avg_rating', 'total_sales'
        )
        read_only_fields = ('balance', 'is_verified', 'avg_rating', 'total_sales')


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

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
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', 'customer'),
            name=validated_data.get('name', ''),
            phone_number=validated_data.get('phone_number', ''),
            address=validated_data.get('address', ''),
            latitude=validated_data.get('latitude'),
            longitude=validated_data.get('longitude'),
        )
        return user


class PostSerializer(serializers.ModelSerializer):
    farmer_name = serializers.ReadOnlyField(source='farmer.name')
    farmer_username = serializers.ReadOnlyField(source='farmer.username')
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = ('farmer',)

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


class ReviewSerializer(serializers.ModelSerializer):
    customer_username = serializers.ReadOnlyField(source='customer.username')
    customer_name = serializers.ReadOnlyField(source='customer.name')
    farmer_username = serializers.ReadOnlyField(source='farmer.username')

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('customer',)

    def validate(self, attrs):
        customer = self.context['request'].user
        farmer = attrs.get('farmer')
        rating = attrs.get('rating')

        if rating < 1 or rating > 5:
            raise serializers.ValidationError({"rating": "Rating must be between 1 and 5."})

        if farmer.role != 'farmer':
            raise serializers.ValidationError({"farmer": "You can only review users with the 'farmer' role."})

        # Check if customer has a completed order from this farmer
        has_completed_order = Order.objects.filter(
            customer=customer,
            post__farmer=farmer,
            status='completed'
        ).exists()

        if not has_completed_order:
            raise serializers.ValidationError(
                {"non_field_errors": "You can only review a farmer after completing a purchase from them."}
            )

        return attrs
