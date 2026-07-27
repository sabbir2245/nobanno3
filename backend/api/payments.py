import json
import uuid
from decimal import Decimal, InvalidOperation
from datetime import datetime

import requests
from django.conf import settings
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Payment


def _sslcommerz_base():
    return (
        'https://sandbox.sslcommerz.com'
        if settings.SSLCOMMERZ_IS_SANDBOX
        else 'https://securepay.sslcommerz.com'
    )


def _initiate_session(amount, tran_id, cus_name, cus_email, cus_phone,
                      success_url, fail_url, cancel_url, ipn_url):
    url = f'{_sslcommerz_base()}/gwprocess/v4/api.php'
    payload = {
        'store_id': settings.SSLCOMMERZ_STORE_ID,
        'store_passwd': settings.SSLCOMMERZ_STORE_PASSWORD,
        'total_amount': f'{amount:.2f}',
        'currency': 'BDT',
        'tran_id': tran_id,
        'success_url': success_url,
        'fail_url': fail_url,
        'cancel_url': cancel_url,
        'ipn_url': ipn_url,
        'cus_name': cus_name,
        'cus_email': cus_email,
        'cus_phone': cus_phone,
        'cus_add1': 'N/A',
        'cus_city': 'N/A',
        'cus_country': 'Bangladesh',
        'shipping_method': 'NO',
        'product_name': 'Wallet Topup',
        'product_category': 'General',
        'product_profile': 'general',
    }
    resp = requests.post(url, data=payload, timeout=30)
    try:
        return resp.json()
    except json.JSONDecodeError:
        raise requests.RequestException(
            f'Status {resp.status_code}, body: {resp.text[:500]}'
        )


def _validate_session(val_id):
    url = f'{_sslcommerz_base()}/validator/api/validationserverAPI.php'
    params = {
        'val_id': val_id,
        'store_id': settings.SSLCOMMERZ_STORE_ID,
        'store_passwd': settings.SSLCOMMERZ_STORE_PASSWORD,
        'v': 1,
        'format': 'json',
    }
    resp = requests.get(url, params=params, timeout=30)
    try:
        return resp.json()
    except json.JSONDecodeError:
        raise requests.RequestException(
            f'Status {resp.status_code}, body: {resp.text[:500]}'
        )


class PaymentInitiateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        if not amount:
            return Response({'error': 'Amount is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError
        except (ValueError, InvalidOperation):
            return Response({'error': 'Amount must be a positive number.'},
                            status=status.HTTP_400_BAD_REQUEST)

        suffix = uuid.uuid4().hex[:6].upper()
        tran_id = f"NOB-{request.user.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{suffix}"

        local_host = request.get_host()
        tunnel_host = settings.CLOUDFLARE_TUNNEL_URL
        success_url = f'http://{local_host}/api/payments/sslcommerz/success/'
        fail_url = f'http://{local_host}/api/payments/sslcommerz/fail/'
        cancel_url = f'http://{local_host}/api/payments/sslcommerz/cancel/'
        ipn_url = (
            f'{tunnel_host}/api/payments/sslcommerz/ipn/'
            if tunnel_host
            else f'http://{local_host}/api/payments/sslcommerz/ipn/'
        )

        try:
            result = _initiate_session(
                amount=amount,
                tran_id=tran_id,
                cus_name=request.user.name or request.user.username,
                cus_email=request.user.email,
                cus_phone=request.user.phone_number or 'N/A',
                success_url=success_url,
                fail_url=fail_url,
                cancel_url=cancel_url,
                ipn_url=ipn_url,
            )
        except requests.RequestException as e:
            return Response({'error': f'Failed to connect to SSLCommerz: {e}'},
                            status=status.HTTP_502_BAD_GATEWAY)

        if result.get('status') != 'SUCCESS':
            return Response({
                'error': 'Failed to initiate payment with SSLCommerz.',
                'gateway_response': result,
            }, status=status.HTTP_502_BAD_GATEWAY)

        payment = Payment.objects.create(
            user=request.user,
            amount=amount,
            transaction_id=tran_id,
            status='initiated',
            gateway_response=result,
        )

        return Response({
            'payment_id': payment.id,
            'transaction_id': tran_id,
            'gateway_url': result['GatewayPageURL'],
            'amount': f'{amount:.2f}',
        })


@method_decorator(csrf_exempt, name='dispatch')
class PaymentSuccessView(APIView):
    permission_classes = []

    def post(self, request):
        tran_id = request.data.get('tran_id')
        if tran_id:
            Payment.objects.filter(transaction_id=tran_id).update(status='success')
        return Response({
            'status': 'success',
            'message': 'Payment successful.',
            'transaction_id': tran_id,
        })


@method_decorator(csrf_exempt, name='dispatch')
class PaymentFailView(APIView):
    permission_classes = []

    def post(self, request):
        tran_id = request.data.get('tran_id')
        if tran_id:
            Payment.objects.filter(transaction_id=tran_id).update(status='failed')
        return Response({
            'status': 'failed',
            'message': 'Payment failed.',
            'transaction_id': tran_id,
        })


@method_decorator(csrf_exempt, name='dispatch')
class PaymentCancelView(APIView):
    permission_classes = []

    def post(self, request):
        tran_id = request.data.get('tran_id')
        if tran_id:
            Payment.objects.filter(transaction_id=tran_id).update(status='cancelled')
        return Response({
            'status': 'cancelled',
            'message': 'Payment cancelled.',
            'transaction_id': tran_id,
        })


@method_decorator(csrf_exempt, name='dispatch')
class PaymentIPNView(APIView):
    permission_classes = []

    def post(self, request):
        tran_id = request.data.get('tran_id')
        val_id = request.data.get('val_id')

        if not tran_id:
            return HttpResponse('No tran_id', status=400)

        try:
            payment = Payment.objects.get(transaction_id=tran_id)
        except Payment.DoesNotExist:
            return HttpResponse('Payment not found', status=404)

        if payment.status == 'success':
            return HttpResponse('Already validated')

        if not val_id:
            return HttpResponse('No val_id', status=400)

        try:
            val_result = _validate_session(val_id)
        except requests.RequestException:
            return HttpResponse('Validation request failed', status=502)

        payment.gateway_response = val_result
        payment.save()

        if val_result.get('status') == 'VALID':
            payment.status = 'success'
            payment.save()
            return HttpResponse('Payment validated')
        else:
            payment.status = 'failed'
            payment.save()
            return HttpResponse('Payment validation failed')


class PaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, transaction_id):
        try:
            payment = Payment.objects.get(
                transaction_id=transaction_id, user=request.user)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({
            'transaction_id': payment.transaction_id,
            'amount': str(payment.amount),
            'status': payment.status,
            'created_at': payment.created_at,
        })
