# 🧪 Testing the Nobanno Django Backend

This document provides step-by-step instructions on setting up, seeding, and testing the Nobanno agricultural marketplace REST API.

---

## 📋 Table of Contents
1. [Prerequisites & Installation](#1-prerequisites--installation)
2. [Running Automated Tests](#2-running-automated-tests)
3. [Running the Development Server](#3-running-the-development-server)
4. [Seeding Sandbox Test Data](#4-seeding-sandbox-test-data)
5. [Manual API Testing (Endpoints Reference)](#5-manual-api-testing-endpoints-reference)

---

## 1. Prerequisites & Installation

To run this backend locally, make sure you have Python 3.10+ installed.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\activate
     ```
   - **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations:
   ```bash
   python manage.py migrate
   ```

---

## 2. Running Automated Tests

We have written a comprehensive suite of integration tests in [tests.py](file:///c:/everyProject/npbanno3/backend/api/tests.py) covering registration, logins, stock/balance safety checkout, geolocation calculations, and customer-payout completions.

Run the test suite using:
```bash
python manage.py test api
```

---

## 3. Running the Development Server

To start the local development server, run:
```bash
python manage.py runserver 0.0.0.0:8000
```
The API root will be accessible at: `http://localhost:8000/api/`

---

## 4. Seeding Sandbox Test Data

We have provided a custom management command to clear the database and seed it with realistic test data (farmers, customers, post listings, completed orders, and reviews).

Run the seed command:
```bash
python manage.py seed_data
```

### Seeded Credentials & Balances
- **Super Admin**:
  - Username: `admin` | Password: `adminpassword123`
- **Farmer 1 (Mymensingh)**:
  - Username: `farmer_jamal` | Password: `farmerpassword123`
- **Farmer 2 (Bogura)**:
  - Username: `farmer_rahim` | Password: `farmerpassword123`
- **Customer 1 (Banani, Dhaka)**:
  - Username: `customer_sadia` | Password: `customerpassword123` | Balance: `8,500.00`
- **Customer 2 (Uttara, Dhaka)**:
  - Username: `customer_hasan` | Password: `customerpassword123` | Balance: `6,100.00`

---

## 5. Manual API Testing (Endpoints Reference)

Use `curl` or any API client (e.g. Postman, Insomnia) to test the following endpoints.

### A. Authentication & Profiles

#### 1. User Registration
Creates a user role and returns their unique API token.
* **Endpoint**: `POST /api/auth/register/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
     -H "Content-Type: application/json" \
     -d '{
       "username": "new_farmer_1",
       "password": "farmerpassword123",
       "role": "farmer",
       "name": "Mofiz Uddin",
       "phone_number": "01755555555",
       "address": "Rangpur Farms",
       "latitude": 25.7439,
       "longitude": 89.2753
     }'
```

#### 2. User Login
Exchanges credentials for an API token and user info.
* **Endpoint**: `POST /api/auth/login/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{
       "username": "customer_sadia",
       "password": "customerpassword123"
     }'
```

#### 3. View Current User Profile
Retrieves the logged-in user profile metrics.
* **Endpoint**: `GET /api/auth/profile/`
* **Request**:
```bash
curl -X GET http://localhost:8000/api/auth/profile/ \
     -H "Authorization: Token <INSERT_TOKEN_HERE>"
```

---

### B. Crops Management (Posts)

#### 1. Create a Post (Farmers Only)
List a harvest including coordinates and details.
* **Endpoint**: `POST /api/posts/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/posts/ \
     -H "Content-Type: application/json" \
     -H "Authorization: Token <FARMER_JAMAL_TOKEN>" \
     -d '{
       "title": "Fresh Organic Cabbage",
       "description": "Green cabbages directly from the fields. Well preserved.",
       "total_weight_kg": "800.00",
       "price_per_kg": "25.00",
       "latitude": 24.7578,
       "longitude": 90.4003
     }'
```

#### 2. Retrieve & Search Posts
List posts with option for text search, farmer filtering, or geolocation-based radius filtering.
* **Geo-Filtering Endpoint**: `GET /api/posts/?lat=23.7937&lng=90.4066&radius=50`
  *(Filters posts within a 50km radius from Banani, Dhaka and sorts them closest to furthest)*
* **Search Endpoint**: `GET /api/posts/?search=Rice`
* **Request**:
```bash
curl -X GET "http://localhost:8000/api/posts/?lat=23.7937&lng=90.4066&radius=50"
```

---

### C. Checkout & Transactions (Orders)

#### 1. Place an Order (Customers Only)
Purchase bulk weight from a listing. Validates sufficient customer balance and listing weight stock.
* **Endpoint**: `POST /api/orders/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/orders/ \
     -H "Content-Type: application/json" \
     -H "Authorization: Token <CUSTOMER_SADIA_TOKEN>" \
     -d '{
       "post": 1,
       "quantity_kg": "50.00",
       "delivery_address": "Banani Road 11, Dhaka"
     }'
```

#### 2. Ship an Order (Farmers Only)
Farmer changes order status from `pending` to `shipped`.
* **Endpoint**: `POST /api/orders/<ORDER_ID>/ship/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/orders/2/ship/ \
     -H "Authorization: Token <FARMER_JAMAL_TOKEN>"
```

#### 3. Complete an Order (Customers or Admins Only)
Confirms delivery, marking order status as `completed`, and triggers the payout. The remaining 90% payout is automatically added to the Farmer's wallet balance.
* **Endpoint**: `POST /api/orders/<ORDER_ID>/complete/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/orders/2/complete/ \
     -H "Authorization: Token <CUSTOMER_HASAN_TOKEN>"
```

#### 4. Cancel an Order (Customer, Farmer, or Admin)
Allows cancellation of `pending` orders. Refunds the customer's balance and restores crop stock.
* **Endpoint**: `POST /api/orders/<ORDER_ID>/cancel/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/orders/2/cancel/ \
     -H "Authorization: Token <CUSTOMER_HASAN_TOKEN>"
```

---

### D. Reviews

#### 1. Submit a Review (Customers Only)
Review a farmer. Validates that the customer has at least one completed order from that farmer.
* **Endpoint**: `POST /api/reviews/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/reviews/ \
     -H "Content-Type: application/json" \
     -H "Authorization: Token <CUSTOMER_SADIA_TOKEN>" \
     -d '{
       "farmer": 2,
       "rating": 5,
       "comment": "Absolutely perfect transaction! Highly recommended."
     }'
```

---

### E. Dashboards & Wallet Analytics

#### 1. Farmer Wallet Endpoint
Retrieve wallet balance, pending payouts, completed earnings, platform fees deducted, and recent transaction history.
* **Endpoint**: `GET /api/farmer/wallet/`
* **Request**:
```bash
curl -X GET http://localhost:8000/api/farmer/wallet/ \
     -H "Authorization: Token <FARMER_JAMAL_TOKEN>"
```

#### 2. Admin Dashboard Analytics (Admin Only)
Retrieve GMV, Net Profit (10% platform fee from completed orders), active user counts, and geographical crop listing hotspots.
* **Endpoint**: `GET /api/admin/analytics/`
* **Request**:
```bash
curl -X GET http://localhost:8000/api/admin/analytics/ \
     -H "Authorization: Token <ADMIN_TOKEN>"
```

#### 3. Admin Account Verification (Admin Only)
Verify a farmer or customer account.
* **Endpoint**: `POST /api/users/<USER_ID>/verify/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/users/2/verify/ \
     -H "Authorization: Token <ADMIN_TOKEN>"
```

#### 4. Admin Top Up Customer Balance (Admin Only)
Top up a customer balance for testing purchases.
* **Endpoint**: `POST /api/users/<USER_ID>/topup/`
* **Request**:
```bash
curl -X POST http://localhost:8000/api/users/4/topup/ \
     -H "Content-Type: application/json" \
     -H "Authorization: Token <ADMIN_TOKEN>" \
     -d '{
       "amount": "2000.00"
     }'
```
