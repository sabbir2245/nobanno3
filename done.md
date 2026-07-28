# Implementation Complete — bKash + Delivery System

## bKash Payment Gateway (Leg 1: Customer → Admin)

### Backend Changes

| File | Changes |
|------|---------|
| `backend/api/models.py` | Added `bkash_payment_id`, `bkash_trx_id`, `bkash_payment_status`, `paid_amount`, `paid_at` to `Order`. Added `gateway`, `bkash_payment_id`, `bkash_trx_id` to `Payment`. Added `FarmerBankAccount` model. Added `BangladeshLocation` model. Added `service_areas` to `User`. Added `collection_district/upazila/union/ward/point_address` to `Post`. |
| `backend/api/payments.py` | **Rewritten.** Replaced SSLCommerz with bKash Tokenized Checkout API (create, execute, query, refund, grant/refresh token). New views: `BKashPaymentInitiateView`, `BKashPaymentCallbackView`, `BKashPaymentSuccessView`, `BKashPaymentFailView`, `BKashPaymentStatusView`, `BKashPaymentRefundView`. SSLCommerz code preserved as comments. |
| `backend/api/urls.py` | Added 6 bKash routes (`/payments/bkash/initiate/`, `callback/`, `success/`, `fail/`, `status/<id>/`, `refund/`). Added BEFTN route. Added `/locations/`. Added deliveryman routes. SSLCommerz SSL routes removed. |
| `backend/nobanno/settings.py` | Added `BKASH_SANDBOX`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_CALLBACK_URL`. SSLCommerz settings kept for reference. |
| `backend/api/views.py` | Added `DeliverymanDashboardView` (consolidated package view with farmer list, amounts, products, location, phone). Added `BangladeshLocationView` (hierarchical filtering by level+parent). Added `AssignServiceAreaView`. |
| `backend/api/serializers.py` | Added `FarmerBankAccountSerializer`, `BangladeshLocationSerializer`, `UserServiceAreaSerializer`. Updated `OrderSerializer` with deliveryman+farmer fields. Updated `PostSerializer` with collection fields. |
| `backend/api/admin.py` | Registered `FarmerBankAccount` and `BangladeshLocation` in admin. Added bKash fields to Order/Payment admin displays. |

### Frontend Changes

| File | Changes |
|------|---------|
| `frontend/app/(customer)/payment.tsx` | **Rewritten.** "Pay via SSLCommerz" → "Pay with bKash". Calls `api.initiateBkashPayment()`, opens `bkash_url`, polls `api.getBkashPaymentStatus()`. |
| `frontend/app/(customer)/cart.tsx` | Removed "Payment auto-approved for demo" note. |
| `frontend/app/auth/register.tsx` | Added "ডেলিভারি ম্যান" (deliveryman) as 3rd role option with bicycle icon. |
| `frontend/app/auth/login.tsx` | Added deliveryman routing to `/(deliveryman)/dashboard`. |
| `frontend/app/index.tsx` | Added deliveryman routing. |
| `frontend/app/_layout.tsx` | Added `(deliveryman)` stack screen. |
| `frontend/services/api.ts` | Added types: `UserRole` includes `deliveryman`. `User` has `service_areas`. `Order` has full deliveryman/farmer/collection fields. `Post` has collection fields. Added interfaces: `BangladeshLocation`, `DeliverymanPackage`. Added API methods: `initiateBkashPayment`, `getBkashPaymentStatus`, `getDeliverymanDashboard`, `getServiceAreas`, `setServiceAreas`, `getLocations`, `acceptOrder`, `pickupOrder`, `deliverOrder`, `getAvailableOrders`. |

## BEFTN CSV Generation (Leg 2: Admin → Farmer Bank Settlement)

| File | Changes |
|------|---------|
| `backend/api/payments.py` | Added `BEFTNInvoiceView` — generates CSV with SL, Order_ID, Farmer_Name, Bank_Name, Branch_Name, Routing_Number, Account_Number, Account_Type, Mobile_Number, Amount_BDT, Order_Date, Remarks. Skips farmers without bank details (flags them). Summary total at bottom. Admin-only. |
| `backend/api/urls.py` | Added route: GET `/payments/beftn/invoice/?from_date=&to_date=`. |

## Delivery System

| File | Changes |
|------|---------|
| `backend/api/views.py` | `DeliverymanDashboardView` — returns nearby shipped orders with geo-filtering, consolidated package view (total amount, farmer count, products per farmer, collection location, farmer phone). |
| `frontend/app/(deliveryman)/dashboard.tsx` | **New.** Deliveryman dashboard showing available orders with accept/pickup/deliver buttons. Package summary card with farmer info. Tap-to-call for farmers. Tab switcher for available/my-deliveries. |
| `frontend/app/(deliveryman)/_layout.tsx` | **New.** Tab layout for deliveryman section. |
| `frontend/components/CascadingLocationPicker.tsx` | **New.** Cascading dropdown for Division → District → Upazila → Union → Ward. Modal-based selection. Auto-loads children on parent selection. Used for collection point location entry. |

## Migration

| File | Changes |
|------|---------|
| `backend/api/migrations/0006_*.py` | Auto-generated migration adding all new fields/models. Migrated successfully. |

## SSLCommerz Status

SSLCommerz code is **preserved as comments** in `backend/api/payments.py` and settings remain in `settings.py`. No SSLCommerz routes are exposed. No "Pay via SSLCommerz" option appears in the UI.
