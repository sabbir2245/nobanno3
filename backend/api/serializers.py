from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Post, Order, Review, ReviewImage, OTP, ProductType, PostImage, Payment, FarmerBankAccount, BangladeshLocation
from rest_framework.validators import UniqueValidator

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    avg_rating = serializers.FloatField(source='average_rating', read_only=True, allow_null=True)
    total_sales = serializers.ReadOnlyField()
    ratings_count = serializers.IntegerField(read_only=True)
    service_areas = serializers.JSONField(read_only=True, allow_null=True)

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
            'phone_number', 'address',
            'latitude', 'longitude', 'is_verified',
            'avg_rating', 'ratings_count', 'total_sales',
            'service_areas',
        )
        read_only_fields = ('is_verified', 'avg_rating', 'ratings_count', 'total_sales', 'service_areas')

class EmailOrPhoneAuthSerializer(serializers.Serializer):
    email_or_phone = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs.get('email_or_phone')
        password = attrs.get('password')

        if identifier and password:
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

    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all(), message="A user with this email already exists.")]
    )
    phone_number = serializers.CharField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all(), message="A user with this phone number already exists.")]
    )

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'role', 'name',
            'phone_number', 'address', 'latitude', 'longitude'
        )

    def validate_role(self, value):
        if value not in ['farmer', 'customer', 'deliveryman']:
            raise serializers.ValidationError("Role must be 'farmer', 'customer', or 'deliveryman'.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class ProductTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductType
        fields = '__all__'


class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ('id', 'image', 'created_at')

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.image:
            request = self.context.get('request')
            if request is not None:
                rep['image'] = request.build_absolute_uri(instance.image.url)
            else:
                rep['image'] = f"http://192.168.1.100:8000{instance.image.url}"
        return rep


class PostSerializer(serializers.ModelSerializer):
    farmer_name = serializers.ReadOnlyField(source='farmer.name')
    farmer_username = serializers.ReadOnlyField(source='farmer.username')
    farmer_phone = serializers.ReadOnlyField(source='farmer.phone_number')
    farmer_avg_rating = serializers.FloatField(source='farmer.average_rating', read_only=True, allow_null=True)
    farmer_ratings_count = serializers.IntegerField(source='farmer.ratings_count', read_only=True)
    total_price = serializers.SerializerMethodField()
    product_type_name_bn = serializers.ReadOnlyField(source='product_type.name_bn', allow_null=True)
    images = PostImageSerializer(many=True, read_only=True)

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

    def validate(self, attrs):
        product_type = attrs.get('product_type')
        price_per_kg = attrs.get('price_per_kg')
        if product_type and product_type.max_price_limit is not None and price_per_kg:
            if price_per_kg > product_type.max_price_limit:
                raise serializers.ValidationError(
                    f"Price per kg ({price_per_kg}) exceeds the maximum limit ({product_type.max_price_limit}) for {product_type.name_bn}."
                )
        return attrs

    def create(self, validated_data):
        return Post.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance



class BulkOrderItemSerializer(serializers.Serializer):
    post = serializers.PrimaryKeyRelatedField(queryset=Post.objects.all())
    quantity_kg = serializers.DecimalField(max_digits=10, decimal_places=2)


class BulkOrderSerializer(serializers.Serializer):
    items = BulkOrderItemSerializer(many=True)
    delivery_address = serializers.CharField()

    def validate(self, attrs):
        items = attrs['items']
        if not items:
            raise serializers.ValidationError("At least one item is required.")

        for item in items:
            post = item['post']
            qty = item['quantity_kg']
            if qty <= 0:
                raise serializers.ValidationError({"items": f"Quantity must be > 0 for {post.title}."})
            if qty > post.total_weight_kg:
                raise serializers.ValidationError({"items": f"Insufficient stock for {post.title}. Only {post.total_weight_kg}kg available."})
        return attrs

    def create(self, validated_data):
        items = validated_data['items']
        delivery_address = validated_data['delivery_address']
        customer = self.context['request'].user

        with transaction.atomic():
            orders = []
            for item in items:
                post = Post.objects.select_for_update().get(pk=item['post'].pk)
                qty = item['quantity_kg']

                if post.total_weight_kg < qty:
                    raise serializers.ValidationError(
                        {"items": f"Insufficient stock for {post.title}. Only {post.total_weight_kg}kg available."}
                    )

                total_paid = round(qty * post.price_per_kg, 2)

                post.total_weight_kg -= qty
                post.save()

                platform_fee = round(total_paid * Decimal('0.10'), 2)
                farmer_payout = total_paid - platform_fee

                order = Order.objects.create(
                    customer=customer,
                    post=post,
                    quantity_kg=qty,
                    total_paid=total_paid,
                    platform_fee=platform_fee,
                    farmer_payout=farmer_payout,
                    delivery_address=delivery_address,
                    status='pending'
                )
                orders.append(order)
            return orders


class OrderSerializer(serializers.ModelSerializer):
    customer_username = serializers.ReadOnlyField(source='customer.username')
    customer_name = serializers.ReadOnlyField(source='customer.name')
    customer_phone = serializers.ReadOnlyField(source='customer.phone_number')
    post_title = serializers.ReadOnlyField(source='post.title')
    post_farmer_name = serializers.ReadOnlyField(source='post.farmer.name')
    post_farmer_id = serializers.ReadOnlyField(source='post.farmer.id')
    post_farmer_phone = serializers.ReadOnlyField(source='post.farmer.phone_number')
    post_collection_district = serializers.ReadOnlyField(source='post.collection_district')
    post_collection_upazila = serializers.ReadOnlyField(source='post.collection_upazila')
    post_collection_union = serializers.ReadOnlyField(source='post.collection_union')
    post_collection_ward = serializers.ReadOnlyField(source='post.collection_ward')
    post_collection_point_address = serializers.ReadOnlyField(source='post.collection_point_address')
    post_latitude = serializers.ReadOnlyField(source='post.latitude')
    post_longitude = serializers.ReadOnlyField(source='post.longitude')
    deliveryman_name = serializers.ReadOnlyField(source='deliveryman.name', allow_null=True)
    deliveryman_username = serializers.ReadOnlyField(source='deliveryman.username', allow_null=True)
    deliveryman_phone = serializers.ReadOnlyField(source='deliveryman.phone_number', allow_null=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('customer', 'deliveryman', 'total_paid', 'platform_fee', 'farmer_payout', 'status', 'picked_up_at', 'delivered_at',
                           'bkash_payment_id', 'bkash_trx_id', 'bkash_payment_status', 'paid_amount', 'paid_at')

    def validate(self, attrs):
        post = attrs.get('post')
        quantity_kg = attrs.get('quantity_kg')

        if quantity_kg <= 0:
            raise serializers.ValidationError({"quantity_kg": "Quantity must be greater than zero."})

        if post.total_weight_kg < quantity_kg:
            raise serializers.ValidationError(
                {"quantity_kg": f"Insufficient stock. Only {post.total_weight_kg}kg available."}
            )

        return attrs

    def create(self, validated_data):
        customer = self.context['request'].user
        post = validated_data['post']
        quantity_kg = validated_data['quantity_kg']

        with transaction.atomic():
            post = Post.objects.select_for_update().get(pk=post.pk)

            if post.total_weight_kg < quantity_kg:
                raise serializers.ValidationError(
                    {"quantity_kg": f"Insufficient stock. Only {post.total_weight_kg}kg available."}
                )

            total_paid = round(quantity_kg * post.price_per_kg, 2)

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

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.image:
            request = self.context.get('request')
            if request is not None:
                rep['image'] = request.build_absolute_uri(instance.image.url)
            else:
                rep['image'] = f"http://192.168.1.100:8000{instance.image.url}"
            print(f"[DEBUG ReviewImageSerializer] image → {rep['image']}")
        return rep


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


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('user', 'transaction_id', 'status', 'gateway_response')


class FarmerBankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerBankAccount
        fields = '__all__'
        read_only_fields = ('farmer',)


class BangladeshLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BangladeshLocation
        fields = ('id', 'name_en', 'name_bn', 'level', 'parent')


class UserServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'service_areas')