# Nobanno Delivery System — Backend Redesign

Replaces the old **lat/long + free-text** location model with a structured,
Bangladesh administrative hierarchy (Division → District → Upazila → Union)
and implements the batch-collection logic from `DeliverySpec_Nobanno.pdf`.

---

## 1. Goals

1. Everyone gives a **structured location** (District → Upazila → Union) on signup,
   instead of lat/long. No coordinate input required. **Location is mandatory for all roles.**
2. Every **Post** carries a **Location object** (District, Upazila, Union) for its
   collection point.
3. The admin configures a **delivery threshold (kg)** per **Area**.
4. Each **customer order** adds its ordered `quantity_kg` to the pool for the post's
   **Area → Union + Product**. When the pool for a **union** reaches the threshold, the
   system auto-creates a **Batch** for that union, available to delivery partners.
5. Delivery partners see **union batches**, accept one (locks it: **Assigned**), follow
   the pickup route, and close it (**Delivered**), which resets the pool.
6. **Legacy `latitude`/`longitude` user-input data is removed.** Only official reference
   coordinates (from `districts.sql`) may optionally live on `BangladeshLocation`.

---

## 2. Source of Truth: SQL dumps in `backend/geodata/`

The hierarchy is seeded from the provided phpMyAdmin SQL dumps:

| Table          | File                                  | Columns                                        | Parent      |
|----------------|---------------------------------------|------------------------------------------------|-------------|
| `divisions`    | `divisions/divisions.sql`             | `id, name, bn_name, url`                       | —           |
| `districts`    | `districts/districts.sql`             | `id, division_id, name, bn_name, lat, lon, url`| division_id |
| `upazilas`     | `upazilas/upazilas.sql`               | `id, district_id, name, bn_name, url`          | district_id |
| `unions`       | `unions/unions.sql`                   | `id, upazilla_id, name, bn_name, url`          | upazilla_id |

- All four use **integer IDs**. Unions reference `upazilla_id` (note the double-L spelling
  in the dump).
- `districts` also carries `lat`/`lon` — official reference coordinates, kept as **read-only**
  on the District node (used for map hotspots / admin analytics). These are NOT user input.
- `divisions` is the root (no `parent_id`). **Union is the finest granularity** (no Ward).

---

## 3. Model Changes (`backend/api/models.py`)

### 3.1 Keep & extend `BangladeshLocation`

Existing model already has `name_en`, `name_bn`, `level`, `parent`. Add a `geo_id`
to preserve the original SQL integer id (useful for stable references & import idempotency).

```python
class BangladeshLocation(models.Model):
    LEVEL_CHOICES = (
        ('division', 'Division'),
        ('district', 'District'),
        ('upazila', 'Upazila'),
        ('union', 'Union'),
    )
    geo_id = models.IntegerField(null=True, blank=True)  # original SQL id
    name_en = models.CharField(max_length=200)
    name_bn = models.CharField(max_length=200)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    parent = models.ForeignKey('self', on_delete=models.CASCADE,
                               null=True, blank=True, related_name='children')
    # district-level reference coordinates (from districts.sql), read-only
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    url = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['name_en']
        constraints = [
            models.UniqueConstraint(fields=['geo_id', 'level'],
                                    name='uniq_geo_level')
        ]
```

**Convenience properties** (so the API can flatten district/upazila/union in one object):

```python
    def parent_chain(self):
        """Return {district, upazila, union} names given a union-level location."""
        chain = {}
        node = self
        while node:
            chain[node.level] = node
            node = node.parent
        return chain
```

### 3.2 `User` — replace lat/long + string fields with a required location FK

Remove the raw `latitude`/`longitude`/`division`/`district`/`upazila`/`union` strings.
Add a **required location FK** to the most specific node the user selected (a **Union**,
or an Upazila if no union chosen).

```python
class User(AbstractUser):
    ...
    # REQUIRED for every user (all roles) at signup.
    location = models.ForeignKey(
        'BangladeshLocation', on_delete=models.PROTECT,
        related_name='users')
    # (latitude / longitude / division / district / upazila / union columns removed)
```

**Location object on the user** is exposed as a nested read-only object
`{ id, division, district, upazila, union }`.

### 3.3 `Post` — a single required `location` FK (collection point)

Replace the `collection_*` string fields and `latitude`/`longitude` on Post with one
required FK. The farmer picks a **Union** for the collection point; the object carries
the full district → upazila → union chain.

```python
class Post(models.Model):
    farmer = models.ForeignKey(User, on_delete=models.CASCADE,
                               related_name='posts', limit_choices_to={'role': 'farmer'})
    product_type = models.ForeignKey(ProductType, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='posts')
    ...
    total_weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2)

    location = models.ForeignKey(
        'BangladeshLocation', on_delete=models.PROTECT,
        related_name='posts')                     # collection-point union (required)
    collection_point_address = models.TextField(blank=True, default='')
    # legacy latitude / longitude / collection_* columns removed
```

`on_delete=PROTECT` so a union used by active posts cannot be deleted accidentally.

### 3.4 `Area` — admin-managed delivery zone with threshold

An **Area** is the delivery zone from the spec (e.g. "2-3 upazila in close proximity").
It groups a set of Upazilas. The admin sets the **threshold**. Pickup is organized **per
union** inside the area: when a union's pool reaches this threshold, a union batch forms.

```python
class Area(models.Model):
    name = models.CharField(max_length=200)              # e.g. "Comilla Sadar Cluster"
    upazilas = models.ManyToManyField(
        'BangladeshLocation', related_name='areas',
        limit_choices_to={'level': 'upazila'})
    threshold_kg = models.DecimalField(max_digits=10, decimal_places=2)  # e.g. 500
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (threshold {self.threshold_kg}kg)"
```

> **Admin sets the threshold** via the admin UI / a dedicated endpoint:
> `PATCH /api/admin/areas/<id>/` with `{ "threshold_kg": 1000 }`.

### 3.5 `PendingPool` — accumulation ledger (scoped per union)

Tracks pending quantity for an **Area + Union + ProductType**, fed **only when a customer
places an order** (by the ordered `quantity_kg`). Each union has its own pickup point; the
pool is keyed by that union so a batch forms for one union.

```python
class PendingPool(models.Model):
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name='pools')
    union = models.ForeignKey('BangladeshLocation', on_delete=models.CASCADE,
                              related_name='pools',
                              limit_choices_to={'level': 'union'})
    product_type = models.ForeignKey(ProductType, on_delete=models.CASCADE,
                                     related_name='pools')
    pending_quantity_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('area', 'union', 'product_type')
```

> **Trigger:** the pool is incremented inside the **Order create** flow, not at post
> creation. When a customer places an order for a post, that order's `quantity_kg` is added
> to the pool of the post's area→union + product. Post listings themselves do not feed the pool.

### 3.6 `Batch` — per-union, the unit a delivery partner claims

Created automatically when a union pool crosses the area threshold. Bundles the
**contributing customer orders** for that **union** pickup point.

```python
class Batch(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),      # not yet accepted
        ('assigned', 'Assigned'),    # locked by a delivery partner
        ('delivered', 'Delivered'),  # closed
        ('cancelled', 'Cancelled'),
    )
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name='batches')
    union = models.ForeignKey('BangladeshLocation', on_delete=models.PROTECT,
                              related_name='batches',
                              limit_choices_to={'level': 'union'})
    product_type = models.ForeignKey(ProductType, on_delete=models.PROTECT,
                                     related_name='batches')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    deliveryman = models.ForeignKey(User, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='batches',
                                    limit_choices_to={'role': 'deliveryman'})
    total_quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    total_value = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Batch #{self.id} ({self.union}, {self.get_status_display()})"
```

### 3.7 `BatchItem` — one contributing customer order inside a batch

```python
class BatchItem(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='items')
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name='batch_items')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    farmer = models.ForeignKey(User, on_delete=models.PROTECT, related_name='batch_items')
```

> **Batch wraps customer `Order`s (Q4):** A `Batch` is formed from the **customer orders**
> whose ordered quantities filled the union's pool. Each `BatchItem` points to the `Order`
> that contributed. `quantity_kg` equals that order's ordered weight. `farmer` is the
> order's post farmer (the collection point supplies the product). The customer checkout
> creates the `Order` (decrementing post stock) **and** feeds the pool — one flow.

---

## 4. Migration & Seeding Plan

1. **New migration** (`0008_*`):
   - Add `geo_id`, `latitude`, `longitude`, `url` to `BangladeshLocation`.
   - Add `User.location` FK (required); drop `User.latitude/longitude/division/district/upazila/union`.
   - Add `Post.location` FK (required); drop `Post.latitude/longitude/collection_*`.
   - Add `Area`, `PendingPool`, `Batch`, `BatchItem` (`BatchItem.order` → `Order`).
2. **Import script** `management/commands/import_geo.py` (idempotent):
   - Parse the four SQL dumps (or the `.json`/`.csv` equivalents) and populate
     `BangladeshLocation` in order: divisions → districts → upazilas → unions.
   - Use `geo_id`+`level` to detect/upsert; reuse existing rows.
3. **`seed_data.py`** updated to:
   - Call `import_geo` first (or assume geo already seeded).
   - Create 1–2 sample `Area`s with thresholds.
   - Create all users with a `location=` FK (required).
   - Create posts with `location=` instead of coordinates.
4. Run:
   ```bash
   python manage.py migrate
   python manage.py import_geo
   python manage.py seed_data
   ```

---

## 5. API Endpoints

### 5.1 Location hierarchy (existing, extended)

- `GET /api/locations/?level=division`
- `GET /api/locations/?level=district&parent_id=<division_id>`
- `GET /api/locations/?level=upazila&parent_id=<district_id>`
- `GET /api/locations/?level=union&parent_id=<upazila_id>`
- Each node now also returns `{ id, name_en, name_bn, level, parent, latitude, longitude }`.

### 5.2 Registration (farmer/customer/deliveryman)

`POST /api/auth/register/`

```json
{
  "username": "fjamal",
  "email": "jamal@farms.com",
  "password": "F1",
  "role": "farmer",
  "name": "Jamal Uddin",
  "phone_number": "01712345678",
  "location": 4842
}
```

- `location` is the id of the selected **Union** (or Upazila) `BangladeshLocation` and is
  **required for every role** (farmer, customer, deliveryman).
- Response `user.location` = `{ id, division, district, upazila, union }`.

### 5.3 Posts

`POST /api/posts/`

```json
{
  "title": "Fresh Potatoes",
  "product_type": 1,
  "total_weight_kg": 800,
  "price_per_kg": 35.0,
  "location": 4842,
  "collection_point_address": "Village Bazar, Kewatkhali"
}
```

- `location` must be a **Union** (or Upazila) node and is required. The `Location` object
  (district/upazila/union) is serialized read-only on the post.
- `GET /api/posts/` now filters by `area=<area_id>` or `union=<id>` / `upazila=<id>` /
  `district=<id>` instead of `lat`/`lng`/`radius`. (Legacy geo params removed.)

### 5.4 Areas (admin only)

- `GET /api/admin/areas/` — list areas with thresholds.
- `POST /api/admin/areas/` — create `{ name, upazilas: [...], threshold_kg }`.
- `PATCH /api/admin/areas/<id>/` — update threshold.
- `GET /api/areas/` — public list of active areas (for signup/selection).

### 5.5 Pool & Batch (the spec logic)

- **Order create** (`POST /api/orders/` or `POST /api/orders/bulk_create/`) triggers
  **PoolService**: add `order.quantity_kg` to the pool for that **area → union + product**.
  If `pool.pending_quantity_kg >= area.threshold_kg` → auto-create a **Batch** (per union)
  bundling the contributing orders + `BatchItem`s, then **reset the pool to zero** (a new
  pool starts collecting).
- `GET /api/deliveryman/batches/available/` — **pending** batches (one per union) visible
  to the deliveryman. A deliveryman sees batches for unions inside their service areas.
- `POST /api/deliveryman/batches/<id>/accept/` — lock batch:
  - only if `status == 'pending'` and no `deliveryman`;
  - sets `status='assigned'`, `deliveryman=request.user`, `assigned_at=now`.
- `POST /api/deliveryman/batches/<id>/deliver/` — close:
  - only the assigned deliveryman; `status='delivered'`, `delivered_at=now`.

### 5.6 Deliveryman service areas

- Service areas now reference **Area** ids (or upazila/union ids) instead of opaque strings.

---

## 6. PoolService (core batch logic)

Called from the **Order create** flow (single `OrderSerializer.create` and
`BulkOrderSerializer.create`). For each order, add `order.quantity_kg` to the pool of the
post's area→union + product.

```python
def add_to_pool(order: Order):
    post = order.post
    area = Area.objects.for_post(post)              # area containing post.location's upazila
    union = post.location                           # union pickup point (post.location)
    pool, _ = PendingPool.objects.select_for_update().get_or_create(
        area=area, union=union, product_type=post.product_type,
        defaults={'pending_quantity_kg': order.quantity_kg})
    pool.pending_quantity_kg += order.quantity_kg
    pool.save(update_fields=['pending_quantity_kg'])
    if pool.pending_quantity_kg >= area.threshold_kg:
        build_batch(area, union, post.product_type, order.quantity_kg)
        pool.pending_quantity_kg = Decimal('0')     # RESET to zero, new pool starts
        pool.save(update_fields=['pending_quantity_kg'])
```

```python
def build_batch(area, union, product_type, threshold_quantity):
    # Orders that contributed to this pool (status pending, post in this area/union/product)
    contributing_orders = Order.objects.filter(
        status='pending',
        post__location=union,
        post__product_type=product_type,
    ).select_related('post__farmer')
    batch = Batch.objects.create(
        area=area, union=union, product_type=product_type,
        total_quantity_kg=threshold_quantity,
        total_value=sum(o.total_paid for o in contributing_orders))
    for order in contributing_orders:
        BatchItem.objects.create(batch=batch, order=order,
                                 quantity_kg=order.quantity_kg,
                                 farmer=order.post.farmer)
    return batch
```

All pool/batch updates happen inside `transaction.atomic()` (with `select_for_update`
on the pool row) to avoid double-batch creation under concurrency. The pool is always
**reset to zero** after a batch is built; a fresh pool accumulates the next orders.

---

## 7. Backward Compatibility & Data Migration

- **Legacy `latitude`/`longitude` on `User` and `Post` are removed.** The location string
  fields (`division`/`district`/`upazila`/`union`) on `User` are also removed in favor of
  the single `location` FK. Existing rows are not auto-migrated to the FK; the new required
  fields apply from this change forward.
- Official reference coordinates from `districts.sql` may remain as **read-only** fields on
  `BangladeshLocation` (used for map hotspots / admin analytics), not as user input.
- A `Batch` wraps the **customer `Order`s** that filled the union's pool. Batch creation is
  triggered from the existing `Order` create flow, so the customer checkout remains intact;
  the batch layer is added on top for farm→union pickup.
- Any endpoint that previously accepted `lat`/`lng`/`radius` is updated to accept area/
  union/upazila/district ids. `deliverytest.py` and `junktest/` scripts must be updated
  accordingly.

---

## 8. Tests

- Unit tests for `PoolService`: an order adds `quantity_kg`; below threshold → pool stays
  pending; threshold reached → batch created exactly once and pool **resets to zero**;
  subsequent orders start a fresh pool.
- Serializer tests for nested `location` object on User and Post.
- Area admin permission tests (only admin can set threshold).
- Batch accept concurrency test (two deliverymen, only one wins).
- Update `api/tests.py` and the standalone `deliverytest.py`/`junktest` scripts.

---

## 9. Decisions Confirmed

1. **Granularity:** Union is the smallest unit. No Ward.
2. **Signup:** `location` is **required for every role** (farmer, customer, deliveryman).
3. **Batching scope:** per **union**. A deliveryman sees **union batches**; when a union's
   pool reaches the admin-set threshold, the batch is shown to deliverymen.
4. **Threshold:** set per **Area** by the admin.
5. **Legacy data:** `latitude`/`longitude` and string location fields are **removed**
   from `User` and `Post`. Official district reference coords may remain read-only on
   `BangladeshLocation`.
6. **Pool trigger (Q10.2):** the pool is fed **only by customer orders** — each order adds
   its ordered `quantity_kg` to the post's area→union + product pool. Post listings do not
   feed the pool.
7. **Batch vs Order (Q4):** a `Batch` wraps the **customer `Order`s** that filled the union
   pool, via `BatchItem`s referencing `Order`. One flow: checkout creates the `Order`
   (decrementing stock) and feeds the pool.
8. **Pool reset (Q10.1):** after a batch is created the pool is **reset to zero** and a new
   pool starts collecting the next orders.

## 10. Remaining Open Questions

None outstanding — all design decisions are confirmed.
