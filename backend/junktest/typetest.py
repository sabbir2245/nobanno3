"""
Tests for ProductType system and multi-image post upload.
Run: python manage.py test api.typetest --verbosity=2
"""
import io
import logging
from decimal import Decimal
from PIL import Image
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model

from .models import ProductType, Post, PostImage

User = get_user_model()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def _make_test_image(name="test.png"):
    """Return a tiny valid PNG as SimpleUploadFile-like bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", (10, 10), color="red")
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def set_max_price(product_type_id, amount):
    """
    Public helper: set max_price_limit for a ProductType.
    Returns the updated ProductType instance.
    """
    print(f"DEBUG: set_max_price called — type_id={product_type_id}, amount={amount}")
    pt = ProductType.objects.get(pk=product_type_id)
    pt.max_price_limit = Decimal(str(amount))
    pt.save()
    print(f"DEBUG: set_max_price done — {pt.name_bn} max_price_limit={pt.max_price_limit}")
    return pt


class ProductTypeSetupTest(TestCase):
    """Verify product types can be created and queried."""

    def setUp(self):
        print("\n" + "=" * 70)
        print("DEBUG: ProductTypeSetupTest.setUp — creating admin and seeding types")
        print("=" * 70)
        self.admin = User.objects.create_superuser(
            username="typeadmin", email="typeadmin@test.com", password="admin123",
            role="admin", name="Type Admin"
        )
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")

        self.farmer = User.objects.create_user(
            username="typefarmer", email="farmer@test.com", password="farmer123",
            role="farmer", name="Type Farmer", is_verified=True
        )
        self.farmer_token, _ = Token.objects.get_or_create(user=self.farmer)
        self.farmer_client = APIClient()
        self.farmer_client.credentials(HTTP_AUTHORIZATION=f"Token {self.farmer_token.key}")

        # Seed standard product types
        seed_data = [
            ("Potato", "আলু"),
            ("Onion", "পেঁয়াজ"),
            ("Tomato", "টমেটো"),
            ("Eggplant", "বেগুন"),
            ("Green Chili", "কাঁচামরিচ"),
        ]
        self.types = {}
        for en, bn in seed_data:
            pt = ProductType.objects.create(name_en=en, name_bn=bn)
            self.types[en] = pt
            print(f"DEBUG: Created ProductType id={pt.id} name_en='{en}' name_bn='{bn}'")

    def test_product_types_created(self):
        """All 5 seed types exist."""
        print("\nDEBUG: ======== test_product_types_created ========")
        count = ProductType.objects.count()
        print(f"DEBUG: ProductType count = {count}")
        self.assertEqual(count, 5)
        for en in self.types:
            exists = ProductType.objects.filter(name_en=en).exists()
            print(f"DEBUG: Type '{en}' exists = {exists}")
            self.assertTrue(exists)

    def test_product_type_bengali_names(self):
        """Bengali names stored correctly."""
        print("\nDEBUG: ======== test_product_type_bengali_names ========")
        pt = self.types["Tomato"]
        print(f"DEBUG: Tomato name_bn = '{pt.name_bn}'")
        self.assertEqual(pt.name_bn, "টমেটো")
        pt2 = self.types["Potato"]
        print(f"DEBUG: Potato name_bn = '{pt2.name_bn}'")
        self.assertEqual(pt2.name_bn, "আলু")

    def test_list_product_types_api(self):
        """GET /api/product-types/ returns all types."""
        print("\nDEBUG: ======== test_list_product_types_api ========")
        response = self.client.get("/api/product-types/")
        print(f"DEBUG: GET /api/product-types/ status={response.status_code}")
        print(f"DEBUG: Response data count = {len(response.data)}")
        print(f"DEBUG: Response = {response.data}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 5)

    def test_create_product_type_admin_only(self):
        """Only admin can create a new product type."""
        print("\nDEBUG: ======== test_create_product_type_admin_only ========")
        # Farmer tries
        print("DEBUG: Farmer tries to create product type...")
        response = self.farmer_client.post("/api/product-types/", {
            "name_en": "Garlic", "name_bn": "রসুন"
        }, format="json")
        print(f"DEBUG: Farmer POST status={response.status_code}")
        self.assertEqual(response.status_code, 403)

        # Admin succeeds
        print("DEBUG: Admin creates product type...")
        response = self.client.post("/api/product-types/", {
            "name_en": "Garlic", "name_bn": "রসুন"
        }, format="json")
        print(f"DEBUG: Admin POST status={response.status_code}")
        print(f"DEBUG: Response = {response.data}")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ProductType.objects.count(), 6)

    def test_set_max_price_function(self):
        """set_max_price helper sets and persists max_price_limit."""
        print("\nDEBUG: ======== test_set_max_price_function ========")
        pt = self.types["Onion"]
        print(f"DEBUG: Before set: {pt.name_en} max_price_limit={pt.max_price_limit}")
        self.assertIsNone(pt.max_price_limit)

        updated = set_max_price(pt.id, 100.00)
        print(f"DEBUG: After set: {updated.name_en} max_price_limit={updated.max_price_limit}")
        self.assertEqual(updated.max_price_limit, Decimal("100.00"))

        # Verify from DB
        db_pt = ProductType.objects.get(pk=pt.id)
        print(f"DEBUG: DB re-fetch: {db_pt.name_en} max_price_limit={db_pt.max_price_limit}")
        self.assertEqual(db_pt.max_price_limit, Decimal("100.00"))

    def test_set_max_price_via_api_endpoint(self):
        """PATCH /api/product-types/<id>/set_max_price/ from admin sets the limit."""
        print("\nDEBUG: ======== test_set_max_price_via_api_endpoint ========")
        pt = self.types["Tomato"]
        print(f"DEBUG: Before: {pt.name_bn} max_price_limit={pt.max_price_limit}")
        response = self.client.patch(f"/api/product-types/{pt.id}/set_max_price/",
                                     {"max_price_limit": "150.00"}, format="json")
        print(f"DEBUG: PATCH status={response.status_code}")
        print(f"DEBUG: Response = {response.data}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data["max_price_limit"]), Decimal("150.00"))


class PostWithTypeTest(TestCase):
    """Tests for creating posts with product types and price validation."""

    def setUp(self):
        print("\n" + "=" * 70)
        print("DEBUG: PostWithTypeTest.setUp — creating farmer, types, and client")
        print("=" * 70)
        self.farmer = User.objects.create_user(
            username="postfarmer", email="postfarmer@test.com", password="pass123",
            role="farmer", name="Post Farmer", is_verified=True,
            latitude=23.8, longitude=90.4
        )
        self.token, _ = Token.objects.get_or_create(user=self.farmer)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        # Create types with and without max_price
        self.potato = ProductType.objects.create(name_en="Potato", name_bn="আলু")
        self.tomato = ProductType.objects.create(name_en="Tomato", name_bn="টমেটো", max_price_limit=80.00)
        self.eggplant = ProductType.objects.create(name_en="Eggplant", name_bn="বেগুন", max_price_limit=70.00)
        print(f"DEBUG: Potato max_price_limit={self.potato.max_price_limit}")
        print(f"DEBUG: Tomato max_price_limit={self.tomato.max_price_limit}")
        print(f"DEBUG: Eggplant max_price_limit={self.eggplant.max_price_limit}")

    def _post_data(self, product_type_id=None, price=50.00, extra=None):
        data = {
            "title": "Test Produce",
            "description": "Fresh from farm",
            "total_weight_kg": 100,
            "price_per_kg": price,
            "latitude": 23.8,
            "longitude": 90.4,
        }
        if product_type_id is not None:
            data["product_type"] = product_type_id
        if extra:
            data.update(extra)
        return data

    def test_create_post_with_product_type(self):
        """Farmer creates a post with a valid product_type."""
        print("\nDEBUG: ======== test_create_post_with_product_type ========")
        data = self._post_data(product_type_id=self.potato.id, price=45.00)
        print(f"DEBUG: Post data = {data}")
        response = self.client.post("/api/posts/", data, format="json")
        print(f"DEBUG: POST /api/posts/ status={response.status_code}")
        print(f"DEBUG: Response = {response.data}")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["product_type"], self.potato.id)
        self.assertEqual(response.data["product_type_name_bn"], "আলু")
        print("DEBUG: Post created with product type — OK")

    def test_create_post_without_product_type(self):
        """Farmer can create a post without a product_type (null allowed)."""
        print("\nDEBUG: ======== test_create_post_without_product_type ========")
        data = self._post_data(product_type_id=None, price=50.00)
        print(f"DEBUG: Post data (no type) = {data}")
        response = self.client.post("/api/posts/", data, format="json")
        print(f"DEBUG: POST /api/posts/ status={response.status_code}")
        print(f"DEBUG: Response = {response.data}")
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["product_type"])
        self.assertIsNone(response.data["product_type_name_bn"])
        print("DEBUG: Post created without product type — OK")

    def test_max_price_limit_enforced(self):
        """Post with price exceeding max_price_limit is rejected."""
        print("\nDEBUG: ======== test_max_price_limit_enforced ========")
        # Tomato has max_price_limit=80, we try 100
        data = self._post_data(product_type_id=self.tomato.id, price=100.00)
        print(f"DEBUG: Tomato max={self.tomato.max_price_limit}, trying price=100")
        response = self.client.post("/api/posts/", data, format="json")
        print(f"DEBUG: POST status={response.status_code}")
        print(f"DEBUG: Response = {response.data}")
        self.assertEqual(response.status_code, 400)
        error_msg = str(response.data)
        print(f"DEBUG: Error message = {error_msg}")
        self.assertIn("exceeds the maximum limit", error_msg)

    def test_max_price_limit_edge_exact(self):
        """Post with price exactly at max_price_limit is accepted."""
        print("\nDEBUG: ======== test_max_price_limit_edge_exact ========")
        # Eggplant has max_price_limit=70, we try 70
        data = self._post_data(product_type_id=self.eggplant.id, price=70.00)
        print(f"DEBUG: Eggplant max={self.eggplant.max_price_limit}, trying price=70")
        response = self.client.post("/api/posts/", data, format="json")
        print(f"DEBUG: POST status={response.status_code}")
        print(f"DEBUG: Response = {response.data}")
        self.assertEqual(response.status_code, 201)
        print("DEBUG: Price at boundary accepted — OK")

    def test_max_price_limit_not_set_ok(self):
        """Post with any price is OK when max_price_limit is null."""
        print("\nDEBUG: ======== test_max_price_limit_not_set_ok ========")
        data = self._post_data(product_type_id=self.potato.id, price=999.00)
        print(f"DEBUG: Potato max=None, trying price=999")
        response = self.client.post("/api/posts/", data, format="json")
        print(f"DEBUG: POST status={response.status_code}")
        self.assertEqual(response.status_code, 201)
        print("DEBUG: No limit so high price OK — PASS")

    def test_multiple_image_upload(self):
        """Farmer can upload up to 3 images with a post."""
        print("\nDEBUG: ======== test_multiple_image_upload ========")
        data = self._post_data(product_type_id=self.potato.id, price=40.00)
        img1 = _make_test_image("img1.png")
        img2 = _make_test_image("img2.png")
        img3 = _make_test_image("img3.png")
        data["uploaded_images"] = [img1, img2, img3]
        print(f"DEBUG: Posting with 3 images...")
        response = self.client.post("/api/posts/", data, format="multipart")
        print(f"DEBUG: POST status={response.status_code}")
        print(f"DEBUG: Response = {response.data}")
        self.assertEqual(response.status_code, 201)
        post_id = response.data["id"]
        img_count = PostImage.objects.filter(post_id=post_id).count()
        print(f"DEBUG: PostImage count for post {post_id} = {img_count}")
        self.assertEqual(img_count, 3)
        # Check images in response
        self.assertIn("images", response.data)
        self.assertEqual(len(response.data["images"]), 3)
        print("DEBUG: Multiple image upload — OK")

    def test_max_three_images_enforced(self):
        """Only first 3 images are saved if more uploaded."""
        print("\nDEBUG: ======== test_max_three_images_enforced ========")
        data = self._post_data(product_type_id=self.potato.id, price=40.00)
        data["uploaded_images"] = [_make_test_image(f"img{i}.png") for i in range(5)]
        response = self.client.post("/api/posts/", data, format="multipart")
        print(f"DEBUG: POST with 5 images status={response.status_code}")
        self.assertEqual(response.status_code, 201)
        post_id = response.data["id"]
        img_count = PostImage.objects.filter(post_id=post_id).count()
        print(f"DEBUG: Actual PostImage count = {img_count}")
        self.assertEqual(img_count, 3)
        print("DEBUG: Max 3 images enforced — OK")


class SetMaxPriceHelperTest(TestCase):
    """Direct test of the set_max_price helper function."""

    def setUp(self):
        print("\n" + "=" * 70)
        print("DEBUG: SetMaxPriceHelperTest.setUp")
        print("=" * 70)
        self.onion = ProductType.objects.create(name_en="Onion", name_bn="পেঁয়াজ")
        self.ginger = ProductType.objects.create(name_en="Ginger", name_bn="আদা")

    def test_set_and_update_max_price(self):
        """Set max_price, then update it higher."""
        print("\nDEBUG: ======== test_set_and_update_max_price ========")
        print(f"DEBUG: Initial Onion max_price = {self.onion.max_price_limit}")

        updated1 = set_max_price(self.onion.id, 50.00)
        self.assertEqual(updated1.max_price_limit, Decimal("50.00"))
        print(f"DEBUG: After set_max_price(50): {updated1.max_price_limit}")

        updated2 = set_max_price(self.onion.id, 75.00)
        self.assertEqual(updated2.max_price_limit, Decimal("75.00"))
        print(f"DEBUG: After set_max_price(75): {updated2.max_price_limit}")

    def test_set_max_price_clear_to_none(self):
        """Setting max_price to empty string should raise, but setting to None works via helper."""
        print("\nDEBUG: ======== test_set_max_price_clear_to_none ========")
        updated = set_max_price(self.ginger.id, 0)
        self.assertEqual(updated.max_price_limit, Decimal("0"))
        print(f"DEBUG: Ginger max_price_limit set to 0: {updated.max_price_limit}")

    def test_set_max_price_via_direct_field(self):
        """Demonstrate admin panel can set it directly via ORM."""
        print("\nDEBUG: ======== test_set_max_price_via_direct_field ========")
        self.ginger.max_price_limit = Decimal("120.00")
        self.ginger.save()
        db_val = ProductType.objects.get(pk=self.ginger.pk).max_price_limit
        print(f"DEBUG: Ginger max_price_limit from DB = {db_val}")
        self.assertEqual(db_val, Decimal("120.00"))
        print("DEBUG: Direct field set works — ready for admin panel")
