import math
import random
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token

from .models import Post, Order, Review, ReviewImage, OTP, ProductType, PostImage, BangladeshLocation
from .serializers import (
    UserSerializer, RegisterSerializer, PostSerializer,
    OrderSerializer, ReviewSerializer, EmailOrPhoneAuthSerializer,
    ProductTypeSerializer, BulkOrderSerializer,
    BangladeshLocationSerializer,
)
from .permissions import IsFarmer, IsCustomer, IsAdminUser, IsDeliveryman, IsOwnerOrReadOnly

User = get_user_model()

def calculate_haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)



class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class CustomLoginView(ObtainAuthToken):
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailOrPhoneAuthSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        user = self.get_object()
        user.is_verified = True
        user.save()
        return Response({"status": f"User {user.username} has been verified.", "user": UserSerializer(user).data})

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({"status": f"User {user.username} has been suspended."})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({"status": f"User {user.username} has been activated."})

class ProductTypeViewSet(viewsets.ModelViewSet):
    queryset = ProductType.objects.all().order_by('name_en')
    serializer_class = ProductTypeSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminUser()]
        return [permissions.AllowAny()]

    @action(detail=True, methods=['patch'])
    def set_max_price(self, request, pk=None):
        product_type = self.get_object()
        amount = request.data.get('max_price_limit')
        if amount is None:
            return Response({"error": "Provide 'max_price_limit'."}, status=400)
        try:
            product_type.max_price_limit = Decimal(str(amount))
            product_type.save()
            return Response(ProductTypeSerializer(product_type).data)
        except:
            return Response({"error": "Invalid amount."}, status=400)


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated(), IsFarmer()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save(farmer=request.user)
        images = request.FILES.getlist('uploaded_images')
        for img in images[:3]:
            PostImage.objects.create(post=post, image=img)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))

        product_type = request.query_params.get('product_type')
        if product_type:
            queryset = queryset.filter(product_type_id=product_type)

        farmer_id = request.query_params.get('farmer_id')
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)

        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius')

        if lat and lng and radius:
            try:
                lat = float(lat)
                lng = float(lng)
                radius = float(radius)

                lat_range = radius / 111.0
                lng_range = radius / (111.0 * math.cos(math.radians(lat)))

                queryset = queryset.filter(
                    latitude__range=(lat - lat_range, lat + lat_range),
                    longitude__range=(lng - lng_range, lng + lng_range)
                )

                serializer = self.get_serializer(queryset, many=True, context={'request': request})
                data = serializer.data

                filtered_data = []
                for item in data:
                    item_lat = float(item['latitude'])
                    item_lng = float(item['longitude'])
                    dist = calculate_haversine(lat, lng, item_lat, item_lng)
                    if dist <= radius:
                        item['distance_km'] = dist
                        filtered_data.append(item)

                filtered_data.sort(key=lambda x: x['distance_km'])
                return Response(filtered_data)
            except ValueError:
                return Response(
                    {"error": "Invalid geo parameters. Ensure lat, lng, and radius are numbers."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def search_by_keyword(self, request):
        query_str = request.query_params.get('q', '').strip()
        lat_param = request.query_params.get('lat')
        lng_param = request.query_params.get('lng')

        if not query_str or not lat_param or not lng_param:
            return Response(
                {"error": "Missing required parameters. Please provide 'q', 'lat', and 'lng'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lat = float(lat_param)
            lng = float(lng_param)
        except ValueError:
            return Response(
                {"error": "Invalid coordinates. Ensure 'lat' and 'lng' are valid numbers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.get_queryset().filter(
            Q(title__icontains=query_str) | Q(description__icontains=query_str)
        )

        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        results = serializer.data

        for post_data in results:
            post_lat = float(post_data['latitude'])
            post_lng = float(post_data['longitude'])
            post_data['distance_km'] = calculate_haversine(lat, lng, post_lat, post_lng)

        results.sort(key=lambda x: x['distance_km'])

        return Response(results, status=status.HTTP_200_OK)

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action in ['accept', 'pickup', 'deliver', 'available']:
            return [permissions.IsAuthenticated(), IsDeliveryman()]
        if self.action in ['ship']:
            return [permissions.IsAuthenticated(), IsFarmer()]
        if self.action in ['create', 'bulk_create']:
            return [permissions.IsAuthenticated(), IsCustomer()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin' or user.is_staff:
            return Order.objects.all().order_by('-created_at')
        elif user.role == 'farmer':
            return Order.objects.filter(post__farmer=user).order_by('-created_at')
        elif user.role == 'deliveryman':
            return Order.objects.filter(deliveryman=user).order_by('-created_at')
        else:
            return Order.objects.filter(customer=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['post'])
    def bulk_create(self, request, pk=None):
        serializer = BulkOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        orders = serializer.save()
        response_serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def ship(self, request, pk=None):
        order = Order.objects.get(pk=pk)
        self.check_object_permissions(request, order)
        if order.status != 'pending':
            return Response({"error": f"Cannot ship order in '{order.status}' status. Must be 'pending'."}, status=400)
        order.status = 'shipped'
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=404)
        if order.status != 'shipped':
            return Response({"error": f"Cannot accept order in '{order.status}' status. Must be 'shipped'."}, status=400)
        if order.deliveryman is not None:
            return Response({"error": "This order is already assigned to a deliveryman."}, status=400)
        order.deliveryman = request.user
        order.status = 'assigned'
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def pickup(self, request, pk=None):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=404)
        if order.deliveryman != request.user:
            return Response({"error": "This order is not assigned to you."}, status=403)
        if order.status != 'assigned':
            return Response({"error": f"Cannot pick up order in '{order.status}' status. Must be 'assigned'."}, status=400)
        order.status = 'out_for_delivery'
        order.picked_up_at = timezone.now()
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def deliver(self, request, pk=None):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=404)
        if order.deliveryman != request.user:
            return Response({"error": "This order is not assigned to you."}, status=403)
        if order.status != 'out_for_delivery':
            return Response({"error": f"Cannot deliver order in '{order.status}' status. Must be 'out_for_delivery'."}, status=400)
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            order.status = 'completed'
            order.delivered_at = timezone.now()
            order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=False, methods=['get'])
    def available(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 20)
        queryset = Order.objects.filter(status='shipped', deliveryman__isnull=True).select_related('post')
        if lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
                radius = float(radius)
                lat_range = radius / 111.0
                lng_range = radius / (111.0 * math.cos(math.radians(lat)))
                queryset = queryset.filter(
                    post__latitude__range=(lat - lat_range, lat + lat_range),
                    post__longitude__range=(lng - lng_range, lng + lng_range)
                )
            except ValueError:
                return Response({"error": "Invalid coordinates."}, status=400)
        serializer = OrderSerializer(queryset, many=True, context={'request': request})
        data = serializer.data
        if lat and lng:
            for item in data:
                item_lat = float(Order.objects.get(id=item['id']).post.latitude)
                item_lng = float(Order.objects.get(id=item['id']).post.longitude)
                item['distance_km'] = calculate_haversine(lat, lng, item_lat, item_lng)
            data.sort(key=lambda x: x['distance_km'])
        return Response(data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete(self, request, pk=None):
        order = self.get_object()
        user = request.user

        if user.role != 'admin' and not user.is_staff and order.customer != user:
            return Response({"error": "You do not have permission to complete this order."}, status=403)

        if order.status not in ['pending', 'shipped', 'assigned', 'out_for_delivery']:
            return Response({"error": f"Cannot complete order in '{order.status}' status."}, status=400)

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            if order.status == 'completed':
                return Response(OrderSerializer(order).data)
            order.status = 'completed'
            order.delivered_at = timezone.now()
            order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        order = self.get_object()
        user = request.user

        if user.role != 'admin' and not user.is_staff and order.customer != user and order.post.farmer != user:
            return Response({"error": "You do not have permission to cancel this order."}, status=403)

        if order.status not in ['pending']:
            return Response({"error": "Only pending orders can be cancelled."}, status=400)

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            order.status = 'cancelled'
            order.save()
            post = order.post
            post = Post.objects.select_for_update().get(pk=post.pk)
            post.total_weight_kg += order.quantity_kg
            post.save()
        return Response(OrderSerializer(order).data)


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated(), IsCustomer()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        print(f"[DEBUG ReviewViewSet.create] User={request.user.id} POST={dict(request.POST)} FILES={len(request.FILES.getlist('uploaded_images'))}")

        post_id = request.data.get('post')
        if post_id:
            existing = Review.objects.filter(customer=request.user, post_id=post_id).first()
            if existing:
                print(f"[DEBUG ReviewViewSet.create] Duplicate review blocked — user={request.user.id} post={post_id}")
                return Response(
                    {"non_field_errors": "You have already reviewed this product."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(customer=request.user)
        print(f"[DEBUG ReviewViewSet.create] Review #{review.id} saved")

        images = request.FILES.getlist('uploaded_images')
        for i, img in enumerate(images[:3]):
            ri = ReviewImage.objects.create(review=review, image=img)
            print(f"[DEBUG ReviewViewSet.create] ReviewImage #{ri.id} created for review #{review.id} ({img.name})")

        serializer = self.get_serializer(review, context={'request': request})
        headers = self.get_success_headers(serializer.data)
        print(f"[DEBUG ReviewViewSet.create] Response data keys: {list(serializer.data.keys())}")
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        farmer_id = request.query_params.get('farmer_id')
        if farmer_id:
            queryset = queryset.filter(post__farmer_id=farmer_id)
        post_id = request.query_params.get('post_id')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        customer_id = request.query_params.get('customer_id')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class FarmerWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFarmer]

    def get(self, request):
        farmer = request.user

        pending_payouts = Order.objects.filter(
            post__farmer=farmer,
            status__in=['pending', 'shipped']
        ).aggregate(sum=Sum('farmer_payout'))['sum'] or 0.00

        total_earnings = Order.objects.filter(
            post__farmer=farmer,
            status='completed'
        ).aggregate(sum=Sum('farmer_payout'))['sum'] or 0.00

        total_commission = Order.objects.filter(
            post__farmer=farmer,
            status='completed'
        ).aggregate(sum=Sum('platform_fee'))['sum'] or 0.00

        recent_orders = Order.objects.filter(post__farmer=farmer).order_by('-created_at')[:10]
        recent_orders_serialized = OrderSerializer(recent_orders, many=True).data

        return Response({
            "pending_payouts": pending_payouts,
            "total_earnings": total_earnings,
            "total_commission_deductions": total_commission,
            "recent_transactions": recent_orders_serialized
        })


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        completed_gmv = Order.objects.filter(status='completed').aggregate(sum=Sum('total_paid'))['sum'] or 0.00
        total_gmv = Order.objects.exclude(status='cancelled').aggregate(sum=Sum('total_paid'))['sum'] or 0.00

        realized_profit = Order.objects.filter(status='completed').aggregate(sum=Sum('platform_fee'))['sum'] or 0.00
        pending_profit = Order.objects.filter(status__in=['pending', 'shipped']).aggregate(sum=Sum('platform_fee'))['sum'] or 0.00

        active_users = User.objects.filter(is_active=True).count()
        farmers_count = User.objects.filter(role='farmer').count()
        customers_count = User.objects.filter(role='customer').count()

        hotspots = []
        posts_locations = Post.objects.all().values('id', 'title', 'latitude', 'longitude', 'farmer__username')
        for loc in posts_locations:
            hotspots.append({
                "type": "post",
                "id": loc['id'],
                "label": loc['title'],
                "lat": loc['latitude'],
                "lng": loc['longitude'],
                "owner": loc['farmer__username']
            })

        return Response({
            "metrics": {
                "total_gmv": total_gmv,
                "completed_gmv": completed_gmv,
                "realized_profit": realized_profit,
                "pending_profit": pending_profit
            },
            "user_stats": {
                "active_users": active_users,
                "farmers": farmers_count,
                "customers": customers_count
            },
            "hotspots": hotspots
        })


# =============================================================================
# DELIVERYMAN DASHBOARD & LOCATION HIERARCHY
# =============================================================================

class DeliverymanDashboardView(APIView):
    """
    GET /api/deliveryman/dashboard/
    Returns nearby available orders grouped for the deliveryman.
    Supports: lat, lng, radius query params for geo-filtering and a `tab`
    query parameter (`available` or `my-deliveries`).
    
    Returns consolidated package view:
    - Total amount for the package
    - Number of farmers
    - List of products per farmer
    - Location(s) for pickup (collection point hierarchy + address)
    - Farmer contact info (phone number)
    """
    permission_classes = [permissions.IsAuthenticated, IsDeliveryman]

    def get(self, request):
        print(f"[DELIVERYMAN DASHBOARD] User {request.user.id} fetching dashboard")

        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 20)
        tab = request.query_params.get('tab', 'available')

        if tab not in ['available', 'my-deliveries']:
            return Response({"error": "Invalid dashboard tab."}, status=400)

        if tab == 'available':
            # Orders remain available only until a deliveryman accepts them.
            queryset = Order.objects.filter(
                status='shipped',
                deliveryman__isnull=True
            ).select_related('post__farmer', 'post__product_type', 'customer').order_by('created_at')
        else:
            # Accepted orders belong to the current deliveryman and must never
            # be mixed into the nearby, available-order list.
            queryset = Order.objects.filter(
                deliveryman=request.user
            ).select_related('post__farmer', 'post__product_type', 'customer').order_by('-created_at')

        # Geo-filter only applies to nearby orders. A deliveryman's own work
        # remains visible even when it is no longer near their current location.
        if tab == 'available' and lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
                radius = float(radius)
                lat_range = radius / 111.0
                lng_range = radius / (111.0 * math.cos(math.radians(lat)))
                queryset = queryset.filter(
                    post__latitude__range=(lat - lat_range, lat + lat_range),
                    post__longitude__range=(lng - lng_range, lng + lng_range)
                )
                print(f"[DELIVERYMAN DASHBOARD] Geo-filtered: lat={lat}, lng={lng}, radius={radius}km")
            except ValueError:
                return Response({"error": "Invalid coordinates."}, status=400)

        # Also filter by deliveryman's service areas if set
        if tab == 'available' and request.user.service_areas:
            # service_areas is a JSON list of area identifiers
            # We filter orders whose post matches those areas
            # For simplicity, we'll use the collection_ fields on Post
            print(f"[DELIVERYMAN DASHBOARD] User service areas: {request.user.service_areas}")

        serializer = OrderSerializer(queryset, many=True, context={'request': request})
        data = serializer.data

        # Add distance calculation
        if tab == 'available' and lat and lng:
            lat_f = float(lat)
            lng_f = float(lng)
            for item in data:
                item_lat = float(item.get('post_latitude', 0))
                item_lng = float(item.get('post_longitude', 0))
                item['distance_km'] = calculate_haversine(lat_f, lng_f, item_lat, item_lng)
            data.sort(key=lambda x: x.get('distance_km', 9999))

        # Build consolidated package view
        farmers_map = {}
        for item in data:
            farmer_id = item.get('post_farmer_id')
            if farmer_id not in farmers_map:
                farmers_map[farmer_id] = {
                    'farmer_id': farmer_id,
                    'farmer_name': item.get('post_farmer_name', 'Unknown'),
                    'farmer_phone': item.get('post_farmer_phone', ''),
                    'products': [],
                    'total_amount': 0,
                    'collection_district': item.get('post_collection_district', ''),
                    'collection_upazila': item.get('post_collection_upazila', ''),
                    'collection_union': item.get('post_collection_union', ''),
                    'collection_ward': item.get('post_collection_ward', ''),
                    'collection_point_address': item.get('post_collection_point_address', ''),
                }
            farmers_map[farmer_id]['products'].append({
                'order_id': item['id'],
                'product_title': item.get('post_title', ''),
                'quantity_kg': item.get('quantity_kg', '0'),
                'total_paid': item.get('total_paid', '0'),
            })
            farmers_map[farmer_id]['total_amount'] += float(item.get('total_paid', 0))

        package = {
            'total_orders': len(data),
            'total_amount': sum(float(item.get('total_paid', 0)) for item in data),
            'farmer_count': len(farmers_map),
            'farmers': list(farmers_map.values()),
        }

        print(f"[DELIVERYMAN DASHBOARD] Returning {len(data)} orders across {len(farmers_map)} farmers")

        return Response({
            'orders': data,
            'package_summary': package,
        })


class BangladeshLocationView(APIView):
    """
    GET /api/locations/?level=district&parent_id=1
    Returns administrative locations filtered by level and parent.
    
    Levels: division, district, upazila, union, ward
    - To get all divisions: GET /api/locations/?level=division
    - To get districts of a division: GET /api/locations/?level=district&parent_id=<division_id>
    - To get upazilas of a district: GET /api/locations/?level=upazila&parent_id=<district_id>
    - etc.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        level = request.query_params.get('level')
        parent_id = request.query_params.get('parent_id')

        queryset = BangladeshLocation.objects.all()

        if level:
            queryset = queryset.filter(level=level)
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)

        queryset = queryset.order_by('name_en')
        serializer = BangladeshLocationSerializer(queryset, many=True)
        print(f"[LOCATIONS] Fetched {queryset.count()} locations (level={level}, parent={parent_id})")
        return Response(serializer.data)


class AssignServiceAreaView(APIView):
    """
    GET/POST /api/deliveryman/service-areas/
    
    GET: Returns the deliveryman's current service areas.
    POST: Body { service_areas: [1, 2, 3] } — updates service areas (list of location IDs).
    """
    permission_classes = [permissions.IsAuthenticated, IsDeliveryman]

    def get(self, request):
        print(f"[SERVICE AREAS] User {request.user.id} fetching service areas")
        return Response({
            'service_areas': request.user.service_areas or [],
        })

    def post(self, request):
        service_areas = request.data.get('service_areas', [])
        print(f"[SERVICE AREAS] User {request.user.id} setting service areas: {service_areas}")

        if not isinstance(service_areas, list):
            return Response({"error": "service_areas must be a list."}, status=400)

        user = request.user
        user.service_areas = service_areas
        user.save(update_fields=['service_areas'])

        return Response({
            'status': 'ok',
            'service_areas': user.service_areas,
        })
