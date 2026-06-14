from rest_framework import serializers, generics, permissions
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum
from .models import User, Post

# ==========================================
# 1. SERIALIZERS
# ==========================================

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Excludes sensitive fields like balance, role, and is_verified
        fields = ['name', 'phone_number', 'address', 'email', 'latitude', 'longitude']
        
    def validate_email(self, value):
        user = self.context['request'].user
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class PostUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['title', 'description', 'image', 'image_url', 'total_weight_kg', 'price_per_kg', 'latitude', 'longitude']


# ==========================================
# 2. VIEWS
# ==========================================

class UserUpdateView(generics.RetrieveUpdateAPIView):
    """
    PUT/PATCH/GET endpoint for the logged-in user's own profile.
    """
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PostUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    PUT/PATCH/GET/DELETE endpoint for a specific post.
    """
    queryset = Post.objects.all()
    serializer_class = PostUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        # Security check: ensures only the post's farmer can modify it
        post = self.get_object()
        if post.farmer != self.request.user:
            raise PermissionDenied("You do not have permission to edit this post.")
        serializer.save()