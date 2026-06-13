import math
import random
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token

from .models import Post, Order, Review, OTP
from .serializers import (
    UserSerializer, RegisterSerializer, PostSerializer,
    OrderSerializer, ReviewSerializer , EmailOrPhoneAuthSerializer
    
    
)
from .permissions import IsFarmer, IsCustomer, IsAdminUser, IsOwnerOrReadOnly

User = get_user_model()

# Helper for Haversine distance calculation
def calculate_haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth's radius in km
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
        # 1. Standard DRF instantiation and validation
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Triggers our transaction-safe user generation logic
        user = serializer.save()
        
        # 3. Automatically issue an Auth Token upon signup
        token, created = Token.objects.get_or_create(user=user)
        
        # 4. Return custom registration structural layout
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class CustomLoginView(ObtainAuthToken):
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailOrPhoneAuthSerializer

    def post(self, request, *args, **kwargs):
        # 1. Pass request to EmailOrPhoneAuthSerializer to route authentication
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # 2. Extract validated user instance 
        user = serializer.validated_data['user']
        
        # 3. Fetch existing token or create a new one
        token, created = Token.objects.get_or_create(user=user)
        
        # 4. Respond with both access token and comprehensive profile context
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
    """
    Admin-only viewset to manage users (suspend, ban, verify, top up balance).
    """
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

    @action(detail=True, methods=['post'])
    def topup(self, request, pk=None):
        user = self.get_object()
        amount = request.data.get('amount')
        if not amount:
            return Response({"error": "Please provide an 'amount' to top up."}, status=400)
        try:
            amount_dec = float(amount)
            if amount_dec <= 0:
                raise ValueError()
        except ValueError:
            return Response({"error": "Amount must be a positive number."}, status=400)

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            user.balance += Decimal(str(amount_dec))
            user.save()

        return Response({"status": f"Topped up {amount} units.", "user": UserSerializer(user).data})

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated(), IsFarmer()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Check for search queries
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))

        # Check for specific farmer filter
        farmer_id = request.query_params.get('farmer_id')
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)

        # Check for geo-location filtering
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius') # in km

        if lat and lng and radius:
            try:
                lat = float(lat)
                lng = float(lng)
                radius = float(radius)

                # Bounding box filter (1 degree of latitude is ~111km)
                lat_range = radius / 111.0
                lng_range = radius / (111.0 * math.cos(math.radians(lat)))

                queryset = queryset.filter(
                    latitude__range=(lat - lat_range, lat + lat_range),
                    longitude__range=(lng - lng_range, lng + lng_range)
                )

                # Explicitly inject request context into the serializer here!
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
                
                # Sort by distance
                filtered_data.sort(key=lambda x: x['distance_km'])
                return Response(filtered_data)
            except ValueError:
                return Response(
                    {"error": "Invalid geo parameters. Ensure lat, lng, and radius are numbers."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Normal list fallback - inject request context explicitly
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def search_by_keyword(self, request):
        """
        Filters posts by a text keyword match and sorts the entire match list 
        by absolute distance relative to the user's coordinates (nearest first).
        """
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

        # 1. Filter database records by matching text criteria
        queryset = self.get_queryset().filter(
            Q(title__icontains=query_str) | Q(description__icontains=query_str)
        )

        # 2. Serialize database matches with absolute request context injected!
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        results = serializer.data

        # 3. Inject exact haversine distance calculations into the payloads
        for post_data in results:
            post_lat = float(post_data['latitude'])
            post_lng = float(post_data['longitude'])
            post_data['distance_km'] = calculate_haversine(lat, lng, post_lat, post_lng)

        # 4. Sort arrays inside Python by distance
        results.sort(key=lambda x: x['distance_km'])

        return Response(results, status=status.HTTP_200_OK) 
    
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated(), IsCustomer()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin' or user.is_staff:
            return Order.objects.all().order_by('-created_at')
        elif user.role == 'farmer':
            return Order.objects.filter(post__farmer=user).order_by('-created_at')
        else:  # customer
            return Order.objects.filter(customer=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsFarmer])
    def ship(self, request, pk=None):
        order = self.get_object()
        if order.status != 'pending':
            return Response({"error": f"Cannot ship order in '{order.status}' status. Must be 'pending'."}, status=400)
        
        order.status = 'shipped'
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete(self, request, pk=None):
        order = self.get_object()
        user = request.user
        
        # Customer of the order or Admin can complete it
        if user.role != 'admin' and not user.is_staff and order.customer != user:
            return Response({"error": "You do not have permission to complete this order."}, status=403)

        if order.status not in ['pending', 'shipped']:
            return Response({"error": f"Cannot complete order in '{order.status}' status."}, status=400)

        with transaction.atomic():
            # Refresh order and lock row
            order = Order.objects.select_for_update().get(pk=order.pk)
            if order.status == 'completed':
                return Response(OrderSerializer(order).data)
            
            order.status = 'completed'
            order.save()

            # Payout goes to farmer's balance
            farmer = order.post.farmer
            farmer = User.objects.select_for_update().get(pk=farmer.pk)
            farmer.balance += order.farmer_payout
            farmer.save()

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        order = self.get_object()
        user = request.user

        # Customer or Farmer or Admin can cancel
        if user.role != 'admin' and not user.is_staff and order.customer != user and order.post.farmer != user:
            return Response({"error": "You do not have permission to cancel this order."}, status=403)

        if order.status not in ['pending']:
            return Response({"error": "Only pending orders can be cancelled."}, status=400)

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            order.status = 'cancelled'
            order.save()

            # Refund customer
            customer = order.customer
            customer = User.objects.select_for_update().get(pk=customer.pk)
            customer.balance += order.total_paid
            customer.save()

            # Restore crop inventory weight
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

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        farmer_id = request.query_params.get('farmer_id')
        if farmer_id:
            queryset = queryset.filter(farmer_id=farmer_id)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class FarmerWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsFarmer]

    def get(self, request):
        farmer = request.user
        
        # Calculate pending payouts
        pending_payouts = Order.objects.filter(
            post__farmer=farmer,
            status__in=['pending', 'shipped']
        ).aggregate(sum=Sum('farmer_payout'))['sum'] or 0.00

        # Calculate completed earnings
        total_earnings = Order.objects.filter(
            post__farmer=farmer,
            status='completed'
        ).aggregate(sum=Sum('farmer_payout'))['sum'] or 0.00

        # Calculate platform commission deductions
        total_commission = Order.objects.filter(
            post__farmer=farmer,
            status='completed'
        ).aggregate(sum=Sum('platform_fee'))['sum'] or 0.00

        # Fetch recent transaction orders
        recent_orders = Order.objects.filter(post__farmer=farmer).order_by('-created_at')[:10]
        recent_orders_serialized = OrderSerializer(recent_orders, many=True).data

        return Response({
            "balance": farmer.balance,
            "pending_payouts": pending_payouts,
            "total_earnings": total_earnings,
            "total_commission_deductions": total_commission,
            "recent_transactions": recent_orders_serialized
        })


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        # Gross Merchandise Value (total paid on completed and active orders)
        completed_gmv = Order.objects.filter(status='completed').aggregate(sum=Sum('total_paid'))['sum'] or 0.00
        total_gmv = Order.objects.exclude(status='cancelled').aggregate(sum=Sum('total_paid'))['sum'] or 0.00
        
        # Platform net commission (10% on completed orders)
        realized_profit = Order.objects.filter(status='completed').aggregate(sum=Sum('platform_fee'))['sum'] or 0.00
        pending_profit = Order.objects.filter(status__in=['pending', 'shipped']).aggregate(sum=Sum('platform_fee'))['sum'] or 0.00

        # Users counts
        active_users = User.objects.filter(is_active=True).count()
        farmers_count = User.objects.filter(role='farmer').count()
        customers_count = User.objects.filter(role='customer').count()

        # Geographical Hotspots (coordinates of posts or orders)
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

