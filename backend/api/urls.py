from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, CustomLoginView, UserProfileView,
    UserManagementViewSet, PostViewSet, OrderViewSet,
    ReviewViewSet, FarmerWalletView, AdminAnalyticsView
)

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='user-mgmt')
router.register(r'posts', PostViewSet, basename='posts')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'reviews', ReviewViewSet, basename='reviews')

urlpatterns = [
    # Router endpoints
    path('', include(router.urls)),
    
    # Custom auth endpoints
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', CustomLoginView.as_view(), name='auth-login'),
    path('auth/profile/', UserProfileView.as_view(), name='auth-profile'),
    
    # Custom dashboards
    path('farmer/wallet/', FarmerWalletView.as_view(), name='farmer-wallet'),
    path('admin/analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
]
