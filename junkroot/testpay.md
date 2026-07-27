# SSLCommerz Payment Tests

## Automated tests

File: `backend/api/test_payments.py` (20 tests)

```bash
cd backend
source ../venv/bin/activate
python manage.py test api.test_payments
```

All tests use `unittest.mock.patch` to mock SSLCommerz API calls — **no real money involved**.

---

## Manual end-to-end test (real sandbox)

### Prerequisites

1. Start everything: `./s.sh`
2. Note the **Cloudflare tunnel URL** printed at startup (e.g. `https://xxx.trycloudflare.com`)

### What is the SSLCommerz Sandbox?

It is a fake/test version of the real SSLCommerz payment gateway. It simulates the entire payment flow without using real money or real bank cards. No real SMS is sent. No real transactions happen. Once your code works in sandbox, swap the store ID/password to the live ones and real payments start working.

### Sandbox credentials (hardcoded in `.env`)

| Field | Value |
|-------|-------|
| Store ID | `testbox` |
| Store Password | `qwerty` |
| Environment | Sandbox (`https://sandbox.sslcommerz.com`) |

### Test card numbers

| Type | Card Number | Expiry | CVV |
|------|-------------|--------|-----|
| VISA | `4111 1111 1111 1111` | `12/36` | `111` |
| Mastercard | `5111 1111 1111 1111` | `12/36` | `111` |
| Amex | `3711 1111 1111 111` | `12/36` | `111` |

### Mobile banking (easiest)

Select **bKash** or **Nagad** from the gateway list — no card number needed.

| Field | Value |
|-------|-------|
| Phone number | Any (e.g. `01711111111`) |
| OTP | `111111` or `123456` |

### Step-by-step

1. Open Expo Go on your phone
2. Log in as customer: `csadia` / `C123`
3. Browse products, add items to cart
4. Go to Cart → tap **Proceed to Payment**
5. On Payment screen, tap **Pay via SSLCommerz**
6. Browser opens SSLCommerz checkout page
7. Choose a payment method:
   - **bKash** (easiest) → enter any phone → OTP `111111`
   - **VISA** → card `4111 1111 1111 1111` → expiry `12/36` → CVV `111` → OTP `111111`
   - **Mastercard** → card `5111 1111 1111 1111` → expiry `12/36` → CVV `111` → OTP `111111`
8. On success, SSLCommerz redirects back to your app
9. App polls `/api/payments/status/<tran_id>/` until status becomes `"success"`
10. On success, orders are created from the cart items

### How IPN works

- SSLCommerz sends a server-to-server IPN to the **Cloudflare tunnel URL** (since their servers can't reach your LAN IP)
- The IPN validates the transaction via SSLCommerz validation API and marks the payment as `success`/`failed`
- The frontend polls the status endpoint until it sees `"success"`

---

## Test breakdown

### PaymentInitiateTest (7 tests)

| Test | What it checks |
|------|----------------|
| `test_initiate_payment_success` | POST with valid amount → returns `gateway_url`, creates `Payment` with `initiated` status |
| `test_initiate_payment_missing_amount` | Empty body → 400 |
| `test_initiate_payment_invalid_amount` | Negative amount → 400 |
| `test_initiate_payment_zero_amount` | Amount = 0 → 400 |
| `test_initiate_payment_unauthenticated` | No token → 401 |
| `test_initiate_payment_gateway_failure` | SSLCommerz returns FAILED → 502 |
| `test_initiate_payment_network_error` | SSLCommerz unreachable → 502 |

**Mocks used:** `api.payments._initiate_session`

---

### PaymentIPNTest (5 tests)

| Test | What it checks |
|------|----------------|
| `test_ipn_success_credits_wallet` | Valid `tran_id` + `val_id` with VALID status → payment marked success |
| `test_ipn_failed_does_not_credit` | Validation returns FAILED → payment marked failed |
| `test_ipn_missing_tran_id` | No `tran_id` in POST → 400 |
| `test_ipn_unknown_tran_id` | Non-existent `tran_id` → 404 |
| `test_ipn_already_validated` | Payment already `success` → returns early, validation API not called |

**Mocks used:** `api.payments._validate_session`

---

### PaymentStatusTest (4 tests)

| Test | What it checks |
|------|----------------|
| `test_get_payment_status` | GET own payment → 200 with status + amount |
| `test_get_payment_status_not_found` | Non-existent `transaction_id` → 404 |
| `test_get_payment_status_unauthorized` | No token → 401 |
| `test_cannot_view_others_payment` | Token of user A, query user B's payment → 404 (not found) |

---

### PaymentCallbackTest (4 tests)

| Test | What it checks |
|------|----------------|
| `test_success_callback` | POST to `/sslcommerz/success/` → 200 with `"status": "success"` |
| `test_fail_callback` | POST to `/sslcommerz/fail/` → 200 with `"status": "failed"` |
| `test_cancel_callback` | POST to `/sslcommerz/cancel/` → 200 with `"status": "cancelled"` |
| `test_success_callback_updates_payment` | After success callback, `Payment.status` becomes `success` in DB |

---

## How the mocking works

```python
from unittest.mock import patch

# Mock the internal helper that calls SSLCommerz API
@patch('api.payments._initiate_session')
def test_something(self, mock_init):
    # Tell the mock what to return
    mock_init.return_value = {'status': 'SUCCESS', 'GatewayPageURL': '...'}
    # Now call the API — no network request happens
    response = self.client.post('/api/payments/initiate/', ...)
```

The two mocked functions are:
- `api.payments._initiate_session` — makes POST to SSLCommerz session API
- `api.payments._validate_session` — makes GET to SSLCommerz validation API
