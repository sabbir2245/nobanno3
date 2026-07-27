from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .forget import ForgotPasswordView, ResetPasswordView
from .views import (
    RegisterView, CustomLoginView, UserProfileView,
    UserManagementViewSet, PostViewSet, OrderViewSet,
    ReviewViewSet, FarmerWalletView, AdminAnalyticsView,
    ProductTypeViewSet,
)
from .update import UserUpdateView, PostUpdateView
from .payments import (
    PaymentInitiateView, PaymentSuccessView, PaymentFailView,
    PaymentCancelView, PaymentIPNView, PaymentStatusView,
)

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='user-mgmt')
router.register(r'posts', PostViewSet, basename='posts')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'reviews', ReviewViewSet, basename='reviews')
router.register(r'product-types', ProductTypeViewSet, basename='product-types')

urlpatterns = [
    # Router endpoints
    path('', include(router.urls)),
    
    # Custom auth endpoints
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', CustomLoginView.as_view(), name='auth-login'),
    path('auth/profile/', UserProfileView.as_view(), name='auth-profile'),
    
    # Password reset endpoints
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),

    # Custom dashboards
    path('farmer/wallet/', FarmerWalletView.as_view(), name='farmer-wallet'),
    path('admin/analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),

    path('profile/update/', UserUpdateView.as_view(), name='profile-update'),
    path('posts/<int:pk>/update/', PostUpdateView.as_view(), name='post-update'),

    # SSLCommerz payments
    path('payments/initiate/', PaymentInitiateView.as_view(), name='payment-initiate'),
    path('payments/sslcommerz/success/', PaymentSuccessView.as_view(), name='payment-success'),
    path('payments/sslcommerz/fail/', PaymentFailView.as_view(), name='payment-fail'),
    path('payments/sslcommerz/cancel/', PaymentCancelView.as_view(), name='payment-cancel'),
    path('payments/sslcommerz/ipn/', PaymentIPNView.as_view(), name='payment-ipn'),
    path('payments/status/<str:transaction_id>/', PaymentStatusView.as_view(), name='payment-status'),
]
