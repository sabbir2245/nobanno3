import logging
import random
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from rest_framework import permissions, serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

# Set up standard console logging
logger = logging.getLogger(__name__)

User = get_user_model()

# Ensure relative import matches your OTP location
try:
    from .models import OTP
    logger.info("DEBUG: Successfully imported OTP model.")
except ImportError as e:
    logger.error(f"DEBUG CRITICAL: Failed to import OTP model. Error: {e}")
    raise e


# ==========================================
# SERIALIZERS
# ==========================================

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    method = serializers.ChoiceField(choices=['email', 'sms'], default='email')

    def validate_email(self, value):
        logger.info(f"DEBUG: Validating email entry: '{value}'")
        user_exists = User.objects.filter(email=value).exists()
        
        if not user_exists:
            logger.warning(f"DEBUG: Validation failed. No user matches email: '{value}'")
            raise serializers.ValidationError("No user found with this email address.")
            
        logger.info(f"DEBUG: Email validated successfully. User found for '{value}'")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        email = attrs.get('email')
        otp_code = attrs.get('otp')
        logger.info(f"DEBUG: Processing Reset Password validation for email: '{email}', OTP entry: '{otp_code}'")

        try:
            user = User.objects.get(email=email)
            logger.info(f"DEBUG: Found matching user ID {user.id} for email '{email}'")
        except User.DoesNotExist:
            logger.error(f"DEBUG: No user found matching email '{email}' during password reset step.")
            raise serializers.ValidationError({"email": "No user found with this email address."})

        # Look up the token record
        otp_record = OTP.objects.filter(
            user=user, otp=otp_code, is_used=False
        ).last()

        if not otp_record:
            logger.warning(f"DEBUG: Match failed. No unused OTP record found matching code '{otp_code}' for User ID {user.id}")
            raise serializers.ValidationError({"otp": "Invalid OTP."})

        # Safety checking the model method
        try:
            is_expired = otp_record.is_expired()
            logger.info(f"DEBUG: OTP record found (ID: {otp_record.id}). Expiration status check: {is_expired}")
        except AttributeError as e:
            logger.error(f"DEBUG CRITICAL: Your OTP model is missing an 'is_expired()' method or threw an internal error: {e}")
            raise serializers.ValidationError({"otp": f"Server misconfiguration: {str(e)}"})

        if is_expired:
            logger.warning(f"DEBUG: OTP record ID {otp_record.id} is expired.")
            raise serializers.ValidationError({"otp": "OTP has expired. Please request a new one."})

        attrs['user'] = user
        attrs['otp_record'] = otp_record
        return attrs


# ==========================================
# VIEWS
# ==========================================

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logger.info(f"DEBUG: Received request payload at ForgotPasswordView: {request.data}")
        
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"DEBUG: ForgotPasswordSerializer validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        method = serializer.validated_data.get('method', 'email')
        
        user = User.objects.filter(email=email).first()
        otp_code = f"{random.randint(100000, 999999)}"
        logger.info(f"DEBUG: Generated temporary OTP code '{otp_code}' for user ID {user.id if user else 'None'}")

        try:
            otp_obj = OTP.objects.create(user=user, otp=otp_code, method=method)
            logger.info(f"DEBUG: Successfully committed OTP record to database. ID: {otp_obj.id}")
        except Exception as e:
            logger.error(f"DEBUG CRITICAL: Database write failed while creating OTP record: {e}")
            return Response({"error": "Database error saving OTP record.", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if method == 'email':
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@nobanno.com')
            logger.info(f"DEBUG: Attempting to call send_mail via host: '{getattr(settings, 'EMAIL_HOST', 'Not Set')}' using sender: '{from_email}'")
            
            try:
                send_mail(
                    subject='Your Password Reset OTP',
                    message=f'Your OTP for password reset is: {otp_code}\n\nThis OTP is valid for 5 minutes.',
                    from_email=from_email,
                    recipient_list=[email],
                    fail_silently=False,
                )
                logger.info(f"DEBUG: send_mail completed execution successfully without throwing exceptions to recipient: '{email}'")
            except Exception as e:
                logger.error(f"DEBUG CRITICAL: send_mail raised an exception! Detailed stack: {e}")
                return Response({
                    "error": "Email transmission failed. Check server configurations/credentials.",
                    "smtp_error": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        elif method == 'sms':
            logger.info("DEBUG: SMS method selected, but execution block path is currently empty ('pass').")

        return Response({
            "message": f"OTP has been sent to your {method}.",
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logger.info(f"DEBUG: Received request payload at ResetPasswordView: {request.data}")
        
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"DEBUG: ResetPasswordSerializer validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        otp_record = serializer.validated_data['otp_record']
        new_password = serializer.validated_data['new_password']

        try:
            logger.info(f"DEBUG: Updating password string for user ID: {user.id}")
            user.set_password(new_password)
            user.save()
            logger.info(f"DEBUG: Password encryption and model save successful for user ID: {user.id}")
            
            otp_record.is_used = True
            otp_record.save()
            logger.info(f"DEBUG: OTP record ID {otp_record.id} successfully updated to is_used=True.")
            
        except Exception as e:
            logger.error(f"DEBUG CRITICAL: Encountered an error modifying user or OTP persistence data: {e}")
            return Response({"error": "Data update failed.", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Handle Auth tokens cleanup
        try:
            deleted_count, _ = Token.objects.filter(user=user).delete()
            logger.info(f"DEBUG: Revoked and dropped {deleted_count} active token sessions for user ID {user.id}")
        except Exception as e:
            logger.warning(f"DEBUG WARNING: Could not delete old auth tokens (might not be using rest_framework.authtoken). Error: {e}")

        return Response({
            "message": "Password has been reset successfully. Please login with your new password."
        }, status=status.HTTP_200_OK)