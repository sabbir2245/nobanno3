from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.db.models import Sum, Count
from django.shortcuts import render
from django.urls import path

from .models import User, Post, PostImage, Order, Review, ReviewImage, ProductType, OTP, Payment


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_verified', 'is_active')
    list_filter = ('role', 'is_verified', 'is_active')
    search_fields = ('username', 'email', 'phone_number')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'name', 'phone_number', 'address',
                                       'latitude', 'longitude', 'is_verified',
                                       'average_rating', 'ratings_count')}),
    )


@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ('name_bn', 'name_en', 'max_price_limit', 'post_count')
    list_editable = ('max_price_limit',)
    search_fields = ('name_bn', 'name_en')

    def post_count(self, obj):
        return obj.posts.count()
    post_count.short_description = 'Posts'


class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 0
    max_num = 3


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'farmer', 'product_type', 'total_weight_kg', 'price_per_kg', 'created_at')
    list_filter = ('product_type', 'created_at')
    search_fields = ('title', 'farmer__username')
    inlines = [PostImageInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'post_title', 'quantity_kg', 'status', 'total_paid', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer__username', 'post__title')

    def post_title(self, obj):
        return obj.post.title
    post_title.short_description = 'Product'


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'post', 'rating', 'created_at')
    list_filter = ('rating',)


admin.site.register(ReviewImage)
admin.site.register(OTP)

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'user', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('transaction_id', 'user__username')
    readonly_fields = ('transaction_id', 'user', 'amount', 'gateway_response', 'created_at', 'updated_at')

admin.site.register(User, CustomUserAdmin)


# ── Stats view ─────────────────────────────────────────────────────

def admin_stats_view(request):
    total_gmv = Order.objects.exclude(status='cancelled').aggregate(s=Sum('total_paid'))['s'] or 0
    completed_gmv = Order.objects.filter(status='completed').aggregate(s=Sum('total_paid'))['s'] or 0
    platform_profit = Order.objects.filter(status='completed').aggregate(s=Sum('platform_fee'))['s'] or 0
    pending_profit = Order.objects.exclude(status__in=['completed', 'cancelled']).aggregate(s=Sum('platform_fee'))['s'] or 0

    farmer_count = User.objects.filter(role='farmer').count()
    customer_count = User.objects.filter(role='customer').count()

    type_stats = ProductType.objects.annotate(
        post_count=Count('posts'),
    ).values('name_bn', 'name_en', 'max_price_limit', 'post_count')

    context = {
        'title': 'Platform Statistics',
        'total_gmv': total_gmv,
        'completed_gmv': completed_gmv,
        'platform_profit': platform_profit,
        'pending_profit': pending_profit,
        'farmer_count': farmer_count,
        'customer_count': customer_count,
        'total_users': farmer_count + customer_count,
        'type_stats': type_stats,
        'order_counts': {
            'pending': Order.objects.filter(status='pending').count(),
            'shipped': Order.objects.filter(status='shipped').count(),
            'completed': Order.objects.filter(status='completed').count(),
            'cancelled': Order.objects.filter(status='cancelled').count(),
        },
        'recent_orders': Order.objects.select_related('customer', 'post').order_by('-created_at')[:8],
        'recent_reviews': Review.objects.select_related('customer', 'post').order_by('-created_at')[:8],
    }
    return render(request, 'admin/stats.html', context)


# Add stats URL to the admin site
original_get_urls = admin.site.get_urls


def patched_get_urls():
    urls = [path('stats/', admin_stats_view, name='stats')]
    urls.extend(original_get_urls())
    return urls


admin.site.get_urls = patched_get_urls
# admin.site.index_template = 'admin/stats.html'
