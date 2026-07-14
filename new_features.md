## Feature Completion Status

### ✅ 1. Multiple Picture Upload for Farmer Post
- **Done:** `PostImage` model (FK to Post, up to 3 images), multi-image picker with preview & remove, FormData upload via `uploaded_images` field
- Backend: `backend/api/models.py`, `backend/api/serializers.py`, `backend/api/views.py`
- Frontend: `frontend/app/(farmer)/post.tsx`, `frontend/app/(farmer)/edit-post/[id].tsx`

### ✅ 2. Image Upload on Customer Review
- **Done:** `ReviewImage` model, image picker in `ReviewFormModal` (up to 3 images), `createReviewWithImages` API function, absolute URL building in serializer
- Backend: `backend/api/models.py`, `backend/api/serializers.py`, `backend/api/views.py`
- Frontend: `frontend/components/ReviewFormModal.tsx`, `frontend/services/api.ts`

### ✅ 3. Product Type System
- **Done:** `ProductType` model (name_en, name_bn, max_price_limit), FK on Post, CRUD via `ProductTypeViewSet`, `set_max_price` endpoint, validation on post create/update, Bengali type picker with search
- Backend: All model, serializer, view, URL, seed, and test files
- Frontend: `frontend/components/ProductTypePicker.tsx`, updated post forms, customer home categories

### ✅ 4. Admin Panel
- **Done:** Django admin with all models registered, custom stats dashboard (GMV, user counts, order counts, product type limits), inline `max_price_limit` editing on product type list page
- Backend: `backend/api/admin.py`, `backend/api/templates/admin/stats.html`
- URL: `http://localhost:8000/admin/`

### 🔲 5. Deliveryman System
- Not started

---

### Extra features implemented beyond original list
- **Customer home** — live product type chips replacing hardcoded Grains/Vegetables/Dairy
- **Search with filters** — product type filter in search panel + backend `product_type` query param
- **Product image gallery** — swipable horizontal paging with minimal arrow overlays and dot indicators
- **Price limit hint** — `"Max: ৳<limit>"` placeholder in farmer price field
- **Duplicate review prevention** — backend check prevents double reviews on same post
- **Debug logging** — `[DEBUG]` messages across backend create flows and frontend API calls
- **Expanded seed data** — 34 product types, 23 posts across 5 farmers, 20 orders, 9 reviews (both customers have reviewable and unreviewable orders)
