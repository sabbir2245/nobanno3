# Nobanno API Schema

Base URL: `http://<host>:8000/api`

---

## Authentication

All protected endpoints require:
```
Authorization: Token <token_key>
```

---

## Auth Endpoints

### POST `/api/auth/register/`
Register a new user.

**Request body:**
```json
{
  "username": "farmer_rahim",
  "email": "rahim@farm.com",
  "password": "securepass123",
  "role": "farmer | customer",
  "name": "Rahim Mia",
  "phone_number": "01712345678",
  "address": "Dhaka",
  "latitude": 23.8103,
  "longitude": 90.4125
}
```
**Response `201`:**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": { "id": 1, "username": "farmer_rahim", "role": "farmer", ... }
}
```
**Errors:** `400` — duplicate email, duplicate phone, invalid role.

### POST `/api/auth/login/`
Login with username, email, or phone.

**Request body:**
```json
{
  "email_or_phone": "rahim@farm.com",
  "password": "securepass123"
}
```
**Response `200`:**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": { "id": 1, "username": "farmer_rahim", "role": "farmer", ... }
}
```
**Errors:** `400` — invalid credentials.

### GET/PATCH `/api/auth/profile/`
Get or update your own profile.
- **Auth:** Token required
- **GET:** Returns current user object.
- **PATCH body:** `{ "name": "...", "phone_number": "...", "address": "..." }`

### POST `/api/auth/forgot-password/`
Send OTP for password reset.
- **Body:** `{ "email": "user@example.com", "method": "email | sms" }`
- **Response 200:** `{ "message": "OTP has been sent to your email." }`

### POST `/api/auth/reset-password/`
Reset password with OTP.
- **Body:** `{ "email": "user@example.com", "otp": "123456", "new_password": "newpass123" }`
- **Response 200:** `{ "message": "Password has been reset successfully." }`

### PATCH `/api/profile/update/`
Update own profile fields (name, phone, address, email, lat/lng).
- **Auth:** Token required
- **Body:** `{ "name": "...", "phone_number": "...", "email": "...", "address": "...", "latitude": 23.8, "longitude": 90.4 }`

---

## User Management (Admin only)

All endpoints require `Authorization: Token <admin_token>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/` | List all users |
| GET | `/api/users/{id}/` | Get user details (includes `avg_rating`, `ratings_count`, `total_sales`) |
| POST | `/api/users/{id}/verify/` | Verify a user |
| POST | `/api/users/{id}/suspend/` | Suspend a user |
| POST | `/api/users/{id}/activate/` | Reactivate a user |
| POST | `/api/users/{id}/topup/` | Top up balance. Body: `{ "amount": 50000 }` |

**Response fields (User):**
```json
{
  "id": 1,
  "username": "fjamal",
  "email": "jamal@farms.com",
  "role": "farmer",
  "name": "Jamal Uddin",
  "phone_number": "01712345678",
  "address": "Mymensingh",
  "balance": "4500.00",
  "latitude": 24.7578,
  "longitude": 90.4003,
  "is_verified": true,
  "avg_rating": 4.5,
  "ratings_count": 2,
  "total_sales": "12000.00"
}
```

---

## Posts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/posts/` | Public | List posts (see query params below) |
| GET | `/api/posts/{id}/` | Public | Get single post |
| POST | `/api/posts/` | Farmer | Create a post |
| PATCH | `/api/posts/{id}/` | Owner | Update a post |
| DELETE | `/api/posts/{id}/` | Owner | Delete a post |
| GET | `/api/posts/search_by_keyword/` | Public | Search posts by keyword + location |
| PATCH | `/api/posts/{id}/update/` | Owner | Update post (supports image upload) |

**GET `/api/posts/` query params:**
- `?search=rice` — text search in title/description
- `?farmer_id=3` — filter by farmer
- `?lat=23.8&lng=90.4&radius=50` — geo-filtering (returns posts within radius km, sorted by distance)

**GET `/api/posts/search_by_keyword/?q=rice&lat=23.8&lng=90.4`** — search + distance sort.

**POST body (create):**
```json
{
  "title": "Fresh Potatoes",
  "description": "High quality...",
  "total_weight_kg": 500,
  "price_per_kg": 38,
  "latitude": 24.8481,
  "longitude": 89.3730
}
```
With image: use `multipart/form-data`.

**Response fields (Post):**
```json
{
  "id": 1,
  "title": "Fresh Potatoes",
  "description": "High quality...",
  "total_weight_kg": "500.00",
  "price_per_kg": "38.00",
  "latitude": 24.8481,
  "longitude": 89.3730,
  "farmer": 2,
  "farmer_name": "Rahim Mia",
  "farmer_username": "frahim",
  "farmer_avg_rating": 4.0,
  "farmer_ratings_count": 1,
  "total_price": 19000.0,
  "distance_km": 12.5,
  "created_at": "2026-06-21T10:00:00Z",
  "image": "http://host:8000/media/post_images/potato.jpg"
}
```

---

## Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/orders/` | Authenticated | List own orders (filtered by role) |
| POST | `/api/orders/` | Customer | Create order |
| GET | `/api/orders/{id}/` | Authenticated | Get order detail |
| POST | `/api/orders/{id}/ship/` | Farmer | Mark as shipped |
| POST | `/api/orders/{id}/complete/` | Customer/Admin | Mark as completed |
| POST | `/api/orders/{id}/cancel/` | Customer/Farmer/Admin | Cancel order |

**POST body (create order):**
```json
{
  "post": 1,
  "quantity_kg": 50,
  "delivery_address": "Road 11, Banani, Dhaka"
}
```

**Order response:**
```json
{
  "id": 1,
  "customer": 3,
  "customer_username": "csadia",
  "customer_name": "Sadia's Kitchen",
  "post": 1,
  "post_title": "Fresh Potatoes",
  "post_farmer_name": "Rahim Mia",
  "quantity_kg": "50.00",
  "status": "pending | shipped | completed | cancelled",
  "total_paid": "1900.00",
  "platform_fee": "190.00",
  "farmer_payout": "1710.00",
  "delivery_address": "Road 11, Banani, Dhaka",
  "created_at": "2026-06-21T10:00:00Z"
}
```

---

## Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews/` | Public | List reviews (query: `?farmer_id=2`) |
| POST | `/api/reviews/` | Customer | Create review (requires completed order) |
| PATCH | `/api/reviews/{id}/` | Owner | Update review |
| DELETE | `/api/reviews/{id}/` | Owner | Delete review |

**POST body:**
```json
{
  "farmer": 2,
  "rating": 4,
  "comment": "Good quality, fast delivery"
}
```
Optional: upload up to 3 images via `multipart/form-data` with `uploaded_images` field.

**Validation rules:**
- Rating must be 1–5
- Can only review farmers (not customers)
- Must have a completed order from that farmer
- Each customer can only review a farmer once (unique constraint)

**Response `201`:**
```json
{
  "id": 1,
  "customer": 3,
  "customer_username": "chasan",
  "customer_name": "Hasan Groceries",
  "farmer": 2,
  "farmer_username": "frahim",
  "rating": 4,
  "comment": "Good quality, fast delivery",
  "images": [],
  "created_at": "2026-06-21T11:00:00Z"
}
```

**Signal update:** Creating/deleting a review automatically updates the farmer's `average_rating` and `ratings_count` fields.

---

## Farmer Dashboard

### GET `/api/farmer/wallet/`
- **Auth:** Farmer token required
- **Response:**
```json
{
  "balance": "4500.00",
  "pending_payouts": "1200.00",
  "total_earnings": "8000.00",
  "total_commission_deductions": "800.00",
  "recent_transactions": [ ...orders... ]
}
```

---

## Admin Dashboard

### GET `/api/admin/analytics/`
- **Auth:** Admin token required
- **Response:**
```json
{
  "metrics": {
    "total_gmv": "50000.00",
    "completed_gmv": "35000.00",
    "realized_profit": "3500.00",
    "pending_profit": "1500.00"
  },
  "user_stats": {
    "active_users": 8,
    "farmers": 5,
    "customers": 2
  },
  "hotspots": [
    { "type": "post", "id": 1, "label": "Fresh Potatoes", "lat": 24.8481, "lng": 89.3730, "owner": "frahim" }
  ]
}
```

---

## Complete URL List

| # | Method | URL | Auth | Description |
|---|--------|-----|------|-------------|
| 1 | POST | `/api/auth/register/` | Public | Register |
| 2 | POST | `/api/auth/login/` | Public | Login |
| 3 | GET | `/api/auth/profile/` | Token | Get own profile |
| 4 | PATCH | `/api/auth/profile/` | Token | Update own profile |
| 5 | POST | `/api/auth/forgot-password/` | Public | Send OTP |
| 6 | POST | `/api/auth/reset-password/` | Public | Reset password |
| 7 | GET | `/api/users/` | Admin | List users |
| 8 | GET | `/api/users/{id}/` | Admin | Get user detail |
| 9 | POST | `/api/users/{id}/verify/` | Admin | Verify user |
| 10 | POST | `/api/users/{id}/suspend/` | Admin | Suspend user |
| 11 | POST | `/api/users/{id}/activate/` | Admin | Activate user |
| 12 | POST | `/api/users/{id}/topup/` | Admin | Top up balance |
| 13 | GET | `/api/posts/` | Public | List posts |
| 14 | GET | `/api/posts/{id}/` | Public | Get post |
| 15 | POST | `/api/posts/` | Farmer | Create post |
| 16 | PATCH | `/api/posts/{id}/` | Owner | Update post |
| 17 | DELETE | `/api/posts/{id}/` | Owner | Delete post |
| 18 | GET | `/api/posts/search_by_keyword/` | Public | Search posts |
| 19 | PATCH | `/api/posts/{id}/update/` | Owner | Update post w/ image |
| 20 | GET | `/api/orders/` | Token | List orders |
| 21 | POST | `/api/orders/` | Customer | Create order |
| 22 | GET | `/api/orders/{id}/` | Token | Get order |
| 23 | POST | `/api/orders/{id}/ship/` | Farmer | Ship order |
| 24 | POST | `/api/orders/{id}/complete/` | Customer/Admin | Complete order |
| 25 | POST | `/api/orders/{id}/cancel/` | Token | Cancel order |
| 26 | GET | `/api/reviews/` | Public | List reviews |
| 27 | POST | `/api/reviews/` | Customer | Create review |
| 28 | PATCH | `/api/reviews/{id}/` | Owner | Update review |
| 29 | DELETE | `/api/reviews/{id}/` | Owner | Delete review |
| 30 | GET | `/api/farmer/wallet/` | Farmer | Wallet dashboard |
| 31 | GET | `/api/admin/analytics/` | Admin | Analytics dashboard |
| 32 | PATCH | `/api/profile/update/` | Token | Update profile fields |
| 33 | POST | `/admin/` | Staff | Django admin panel |

---

## Error Format

All errors return an object with field-level or non-field errors:
```json
{ "email": ["A user with this email already exists."] }
{ "non_field_errors": ["Unable to log in with provided credentials."] }
{ "error": "Insufficient balance." }
```
