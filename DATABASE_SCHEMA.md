# Database Schema

## ProductType
Stores crop categories for classification.

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigAutoField (PK) | |
| `name_en` | CharField(100) | English name, unique |
| `name_bn` | CharField(100) | Bengali name |
| `max_price_limit` | DecimalField(10,2) | nullable, max price per kg for this type |
| `created_at` | DateTimeField | auto |

**Relations:** `Post.product_type` FK → ProductType

---

## User (extends AbstractUser)
Single user model with role-based permissions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigAutoField (PK) | |
| `username` | CharField(150) | unique |
| `password` | CharField(128) | hashed |
| `email` | EmailField | unique |
| `role` | CharField(12) | `admin` / `farmer` / `customer` / `deliveryman` |
| `name` | CharField(255) | display name |
| `phone_number` | CharField(15) | nullable, unique |
| `address` | TextField | nullable |
| `balance` | DecimalField(12,2) | default 0.00, wallet balance |
| `latitude` / `longitude` | FloatField | nullable, geo-location |
| `is_verified` | BooleanField | default False |
| `average_rating` | FloatField | nullable, avg of reviews received (farmers) |
| `ratings_count` | IntegerField | default 0 |
| `is_active` / `is_staff` / `is_superuser` | BooleanField | Django built-in |

**Properties:**
- `total_sales` — sum of `total_paid` on completed orders (farmer only)

**Relations:**
- `Post.farmer` FK → User
- `Order.customer` / `Order.deliveryman` FK → User
- `Review.customer` FK → User
- `OTP.user` FK → User

---

## Post
A farmer's product listing.

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigAutoField (PK) | |
| `farmer` | FK → User | the listing farmer |
| `product_type` | FK → ProductType | nullable, crop category |
| `title` | CharField(255) | |
| `description` | TextField | |
| `image` | ImageField | nullable, uploaded to `post_images/` |
| `image_url` | URLField(500) | nullable, legacy URL |
| `total_weight_kg` | DecimalField(10,2) | stock field, decremented on order |
| `price_per_kg` | DecimalField(10,2) | |
| `latitude` / `longitude` | FloatField | harvest/pickup location |
| `created_at` | DateTimeField | auto |
| `updated_at` | DateTimeField | auto |

**Properties:**
- `total_price` = `total_weight_kg * price_per_kg`

**Relations:**
- `PostImage.post` FK → Post (cascade)
- `Order.post` FK → Post
- `Review.post` FK → Post

---

## PostImage
Multiple images per post (up to 3).

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigAutoField (PK) | |
| `post` | FK → Post | cascade delete |
| `image` | ImageField | uploaded to `post_images/` |
| `created_at` | DateTimeField | auto |

---

## Order
Links a customer's purchase to a farmer's post.

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigAutoField (PK) | |
| `customer` | FK → User (role=customer) | |
| `post` | FK → Post | |
| `deliveryman` | FK → User (role=deliveryman) | nullable |
| `quantity_kg` | DecimalField(10,2) | |
| `status` | CharField(20) | `pending` → `shipped` → `assigned` → `out_for_delivery` → `completed` / `cancelled` |
| `total_paid` | DecimalField(10,2) | `qty * price_per_kg` |
| `platform_fee` | DecimalField(10,2) | 10% of total_paid |
| `farmer_payout` | DecimalField(10,2) | total_paid - platform_fee (90%) |
| `delivery_address` | TextField | |
| `picked_up_at` | DateTimeField | nullable, set when deliveryman picks up |
| `delivered_at` | DateTimeField | nullable, set when completed |
| `created_at` | DateTimeField | auto |
| `updated_at` | DateTimeField | auto |

**Flow:** `pending → shipped (farmer) → assigned (deliveryman accepts) → out_for_delivery (picked up) → completed (delivered)` or `cancelled`

**Actions:**
- `POST /orders/<id>/ship/` — farmer ships → `shipped`
- `POST /orders/<id>/accept/` — deliveryman accepts → `assigned`
- `POST /orders/<id>/pickup/` — deliveryman picks up → `out_for_delivery`
- `POST /orders/<id>/deliver/` — deliveryman completes → `completed` (pays farmer)
- `POST /orders/<id>/complete/` — customer confirms delivery → `completed` (pays farmer)
- `POST /orders/<id>/cancel/` — cancels, refunds customer, restores stock
- `POST /orders/bulk_create/` — create multiple orders atomically

---

## Review
Customer feedback on a post after a completed order.

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigAutoField (PK) | |
| `customer` | FK → User (role=customer) | |
| `post` | FK → Post | |
| `rating` | IntegerField | 1–5 |
| `comment` | TextField | optional |
| `created_at` | DateTimeField | auto |

**Constraints:** `unique_together = (customer, post)` — one review per customer per post.

**Relations:**
- `ReviewImage.review` FK → Review (cascade)

---

## ReviewImage
Multiple images per review (up to 3).

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigAutoField (PK) | |
| `review` | FK → Review | cascade delete |
| `image` | ImageField | uploaded to `review_images/` |
| `image_url` | URLField(500) | nullable, legacy |

---

## OTP
One-time password for password reset flow.

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigAutoField (PK) | |
| `user` | FK → User | |
| `otp` | CharField(6) | 6-digit code |
| `method` | CharField(10) | `email` / `sms` |
| `created_at` | DateTimeField | auto |
| `is_used` | BooleanField | default False |

**Expiry:** 5 minutes after `created_at`.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register/` | — | Register new user |
| POST | `/api/auth/login/` | — | Login (email/username/phone) |
| GET/PATCH | `/api/auth/profile/` | Any | Get/update own profile |
| POST | `/api/auth/forgot-password/` | — | Request password reset OTP |
| POST | `/api/auth/reset-password/` | — | Reset password with OTP |
| PATCH | `/api/profile/update/` | Any | Update profile info |
| GET | `/api/posts/` | — | List posts (with geo-filtering) |
| GET | `/api/posts/search_by_keyword/` | — | Search posts by keyword + distance |
| GET/POST | `/api/posts/<id>/` | —/Farmer | Retrieve/create post |
| PATCH | `/api/posts/<id>/update/` | Owner | Update post |
| DELETE | `/api/posts/<id>/` | Owner | Delete post |
| GET | `/api/orders/` | Any | List own orders |
| POST | `/api/orders/` | Customer | Create single order |
| POST | `/api/orders/bulk_create/` | Customer | Create multiple orders atomically |
| POST | `/api/orders/<id>/ship/` | Farmer | Mark order as shipped |
| POST | `/api/orders/<id>/complete/` | Customer | Confirm delivery |
| POST | `/api/orders/<id>/cancel/` | Customer/Farmer/Admin | Cancel pending order |
| POST | `/api/orders/<id>/accept/` | Deliveryman | Accept delivery |
| POST | `/api/orders/<id>/pickup/` | Deliveryman | Pick up order |
| POST | `/api/orders/<id>/deliver/` | Deliveryman | Mark delivered |
| GET | `/api/orders/available/` | Deliveryman | List unassigned shipped orders |
| GET/POST | `/api/reviews/` | —/Customer | List/review a product |
| GET | `/api/product-types/` | — | List product categories |
| GET | `/api/farmer/wallet/` | Farmer | Wallet balance + recent transactions |
| GET | `/api/admin/analytics/` | Admin | Platform metrics |
| POST | `/api/users/<id>/topup/` | Admin | Top up user balance |
