# THE AFP UPDATE — Architecture, API & Recent Changes

This document records the architectural evolution of the Nobanno platform, the
new API surface, and the changes completed so far. It is the authoritative
reference for the **union-based, hierarchical-location** model that replaced the
older GPS (lat/lng) model.

> Admin work is done on a **separate website** (Django admin / Jazzmin), not in
> the mobile app. The domain-specific tools (set product-type max price, set
> union thresholds / areas, and download the settlement `.xlsx`) live there.

---

## 1. The New Architecture at a Glance

```
 Division -> District -> Upazila -> Union   (BangladeshLocation tree,
                                            official reference coords on district)
        │
        ├── User.location        (every role registers with a Union/Upazila)
        ├── Post.location        (farmer listing's collection Union/Upazila)
        │
        └── delivery system
              Area ── many-to-many ── Upazilas  (+ threshold_kg, admin-set)
              PendingPool  (area + union + product_type → running kg)
                    │ pool.pending_quantity_kg >= area.threshold_kg  (admin-set)
                    ▼
              Batch  (a "mega order": one union + one product_type,
                      bundles many member Orders) -- Deliveryman accepts/delivers
```

**Distance** between a customer and a post is computed as *approx km from the
district centroid* (the official read-only district reference coordinates), not
from device GPS.

---

## 2. Key Concepts

- **Hierarchical location** — Every `User` and `Post` points at a
  `BangladeshLocation` node (Union or Upazila). Ancestors (Division→District→Upazila→Union)
  are derived via `parent_chain()`.
- **Union-based batch delivery** — Orders for the same `area → union →
  product_type` accumulate in a `PendingPool`. When the pool crosses the area's
  `threshold_kg`, a `Batch` (mega order) is created containing every
  contributing order as a `BatchItem`. A deliveryman picks a batch from the
  *available* list, accepts it, and marks it delivered (which completes all
  member orders).
- **Approx KM distance** — No lat/lng is captured from users. The app passes the
  customer's Union id (`?union=`) to the posts endpoint; the backend resolves
  both the customer's and the post's district nodes and returns `distance_km`.

---

## 3. Data Model Changes

### `models.BangladeshLocation`
- Self-referencing `parent` FK building the Division/District/Upazila/Union tree.
- `latitude` / `longitude` — **official reference coordinates**, populated only
  on **District** nodes (`districts.sql` import). Read-only — never user input.
- `parent_chain()` → dict of ancestor nodes by level.

### `models.User`
- `location` → FK to `BangladeshLocation` (Union/Upazila). Required by the API
  for every role. (Nullable at DB level for migration safety.)
- `service_areas` → JSON list of **Area IDs** served by a deliveryman.

### `models.Post`
- `location` → FK to `BangladeshLocation` (Union/Upazila). Required by the API.
- `collection_point_address` — free-text pickup address for the union hub.
- **Removed:** `latitude` / `longitude` fields (no longer used).

### `models.Order`
- `delivered_at`, bKash payment fields (`bkash_payment_id`, `bkash_trx_id`,
  `bkash_payment_status`, `paid_amount`, `paid_at`).

### `models.Area` / `models.PendingPool` / `models.Batch` / `models.BatchItem`
- The delivery engine (see §2).

---

## 4. New / Changed API Endpoints

Base URL: `/api/`

### Auth & Profile
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/auth/register/` | **Now requires `location` (Union/Upazila id).** Accepts `username/email/phone/role/password/name/address/location`. Returns `{token, user}`. |
| POST | `/auth/login/` | `{email_or_phone, password}` → `{token, user}`. |
| GET/PATCH | `/auth/profile/` | Current user; `location` returned as flattened object. |
| PATCH | `/profile/update/` | Accepts `location` (Union/Upazila id) to update own location. |
| POST | `/auth/forgot-password/`, `/auth/reset-password/` | Email OTP reset. |

### Posts
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/posts/?union=<id>` | **`union` = distance origin** for `distance_km` (no longer a hard filter). |
| GET | `/posts/?area=&upazila=&district=` | Optional admin-hierarchy filters. |
| GET | `/posts/?farmer_id=` , `/posts/?product_type=` | Filters. |
| GET | `/posts/search_by_keyword/?q=&union=` | Keyword search incl. distance. |
| POST | `/posts/` | **Requires `location`** (farmer's union). Multipart accepts `uploaded_images` (max 3). |
| GET/PATCH/DELETE | `/posts/<id>/` | |
| PATCH/DELETE | `/posts/<id>/update/` | Separate update view. |

**PostSerializer now emits** (extra, beyond model fields):
- `location` (flattened `LocationInfo` object instead of raw id)
- `location_info`, `area` (`{id, name, threshold_kg}`), `farmer_*` fields,
  `total_price`, `images`, `product_type_name_bn`
- `distance_km` — approx km from customer's union **district centroid**
  (computed only when `?union=` is present).

### Orders
| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/orders/` | |
| POST | `/orders/bulk_create/` | `{items:[{post, quantity_kg}], delivery_address}` — maintains per-order `platform_fee` (10%) & `farmer_payout` (90%). |
| POST | `/orders/<id>/complete/` , `/cancel/` | |

**OrderSerializer emits** `post_location` (union chain) + `post_collection_point_address`
so the app can show the pickup hub.

### Delivery System
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/areas/` | List areas (admins create/edit; also listed to deliveryman for service selection). |
| GET | `/batches/` , `/batches/<id>/` | |
| GET | `/batches/available/` | Pending, unassigned batches **filtered by `user.service_areas` (Area ids)**. |
| GET | `/batches/mine/` | Batches assigned to the deliveryman. |
| POST | `/batches/<id>/accept/` | Deliveryman accepts → status `assigned`. |
| POST | `/batches/<id>/deliver/` | Marks `delivered` and completes every member order. |
| GET/POST | `/deliveryman/service-areas/` | GET current / POST `{service_areas:[areaIds]}`. |
| GET | `/locations/?level=&parent_id=` | Cascading list for pickers (Division→…→Ward). |

### Payments (bKash — SSLCommerz removed)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/payments/bkash/initiate/` | `{amount}` → `{bkash_url, payment_id_bkash, transaction_id, ...}` |
| POST | `/payments/bkash/callback/` , `/success/` , `/fail/` | bKash redirects. |
| GET | `/payments/bkash/status/<transaction_id>/` | Polled by the app. |
| POST | `/payments/bkash/refund/` | Admin (web). |
| GET/POST | `/payments/beftn/invoice/` | Admin settlement `.xlsx` download (web). |

### Admin (web only)
| Method | Endpoint | Notes |
|---|---|---|
| · | `/users/<id>/verify` / `suspend` / `activate` | User moderation. |
| GET | `/admin/analytics/` | GMV, profit, user stats, hotspots. |
| PATCH | `/product-types/<id>/set_max_price/` | Sets a product type's `max_price_limit`. |
| · | Django admin + BEFTN xlsx | Set area thresholds, download settlement ledger. |

---

## 5. Frontend Changes (Expo / React Native)

Location is now **hierarchical and selected in-app**, not device GPS.

### New / reworked screens
- **`components/CascadingLocationPicker.tsx`** — reusable Division→District→Upazila→Union→Ward picker using `GET /locations/`.
- **`app/auth/register.tsx`** — now includes the cascading picker and sends `location`; signup only works with a selected Union/Upazila.
- **`app/(farmer)/set-location.tsx`** — rewritten: uses `CascadingLocationPicker` + `PATCH /profile/update/` (was the old `bd-divisions-to-unions` name-string flow).
- **`app/(deliveryman)/service-areas.tsx`** — deliveryman multi-selects the Areas they serve; saves via `POST /deliveryman/service-areas/`.
- **`app/(deliveryman)/dashboard.tsx`** — added a **Service Areas** button; batch cards now show the union pickup + `collection_point_address`.
- **`components/OrderCard.tsx`** & **`app/(customer)/orders.tsx`** — show the order's pickup hub (`post_collection_point_address` + district/upazila/union).

### Distance & nearest
- **`app/(customer)/home.tsx`** — fetches with `?union=<customer.location.id>`; the "Nearest" sort uses the real `distance_km` from the backend (no more device GPS / stale `distance_km=999` ties).
- **`components/ProductCard.tsx`** & **`app/product/[id].tsx`** — display the location chain and `distance_km`.

### Post creation
- **`app/(farmer)/post.tsx`** — sends the farmer's signup `user.location.id` instead of lat/lng.

### `services/api.ts`
- `getPosts` / `searchByKeyword` now take `union` (**removed** `lat/lng/radius`).
- `register` / `createPost` / `updatePost` use `location` (**removed** lat/lng).
- `Post` / `User` gained `location` (`LocationInfo`); `Order` gained `post_location` (removed the bogus `post_collection_district/upazila/union` and `post_latitude/longitude`); `BatchItem` gained `collection_point_address`.
- Added `getAreas()` (`GET /areas/`).
- `constants/theme.ts`: added `red` (fixes delete-button styling).

---

## 6. Operational Notes

- **`s.sh`** — the Cloudflare tunnel was **removed** (it existed for the removed
  SSLCommerz IPN; nothing reads its exported `CLOUDFLARE_TUNNEL_URL`). The script
  now: pip-install → run Django (`0.0.0.0:8000`) → `seed_data` → `expo start -c`.
- **bKash** — `BKASH_CALLBACK_URL` defaults to
  `http://localhost:8000/api/payments/bkash/callback/`; in the sandbox this is a
  browser redirect, so a tunnel is not required for local dev.
- **Seed data** (`manage.py seed_data`) — clears the DB and creates admin +
  farmers (with real union locations), customers, Areas/Upazilas, and posts.
- **Deprecated** — SSLCommerz routes were removed from the backend; the mobile
  app no longer calls `initiatePayment`/`getPaymentStatus`.

---

## 7. Verification

- Backend: `python manage.py test api` → 27 tests pass (location-based signup,
  post-with-location, pool→threshold→batch→deliveryman accept/deliver, etc.).
- Lint/typecheck: `frontend` `tsc --noEmit` (one pre-existing `ProductCard`
  image `null` typing warning unrelated to these changes; the rest is clean).