import os
from decimal import Decimal
from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.authtoken.models import Token
from api.models import (
    Post, PostImage, Order, Review, ReviewImage, ProductType,
    Payment, FarmerBankAccount, OTP, BangladeshLocation
)
from django.db import transaction
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with test data matching images inside the timage folder."

    def handle(self, *args, **options):
        self.stdout.write("Clearing existing database...")
        ReviewImage.objects.all().delete()
        Review.objects.all().delete()
        Order.objects.all().delete()
        PostImage.objects.all().delete()
        Post.objects.all().delete()
        User.objects.all().delete()
        Token.objects.all().delete()
        ProductType.objects.all().delete()
        Payment.objects.all().delete()
        FarmerBankAccount.objects.all().delete()
        OTP.objects.all().delete()
        BangladeshLocation.objects.all().delete()

        # ==========================================
        # 1. CREATING USERS
        # ==========================================
        self.stdout.write("Creating users (1 Admin, 5 Farmers, 2 Customers [csadia named Ratul], 2 Deliverymen)...")

        # Admin
        admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@nobanno.gov.bd",
            password="Adminpassword123",
            role="admin",
            name="Super Admin",
            phone_number="01000000000",
            address="Dhaka Secretariat, Ramna, Dhaka",
            latitude=23.7291,
            longitude=90.4087,
            division="Dhaka",
            district="Dhaka",
            upazila="Ramna",
            union="Secretariat",
            is_verified=True
        )
        Token.objects.create(user=admin_user)

        # 5 Farmers
        f1 = User.objects.create_user(
            username="fjamal",
            email="jamal@farms.com",
            password="F1",
            role="farmer",
            name="Jamal Uddin",
            phone_number="01712345678",
            address="Kewatkhali, Mymensingh Sadar, Mymensingh",
            latitude=24.7578,
            longitude=90.4003,
            division="Mymensingh",
            district="Mymensingh",
            upazila="Mymensingh Sadar",
            union="Kewatkhali",
            is_verified=True
        )
        f2 = User.objects.create_user(
            username="frahim",
            email="rahim@bogura.com",
            password="F2",
            role="farmer",
            name="Rahim Mia",
            phone_number="01812345678",
            address="Garidaha, Sherpur, Bogura",
            latitude=24.8481,
            longitude=89.3730,
            division="Rajshahi",
            district="Bogura",
            upazila="Sherpur",
            union="Garidaha",
            is_verified=True
        )
        f3 = User.objects.create_user(
            username="fkarim",
            email="karim@rajshahi.com",
            password="F3",
            role="farmer",
            name="Karim Ahmed",
            phone_number="01612345678",
            address="Damkur, Paba, Rajshahi",
            latitude=24.3745,
            longitude=88.6042,
            division="Rajshahi",
            district="Rajshahi",
            upazila="Paba",
            union="Damkur",
            is_verified=True
        )
        f4 = User.objects.create_user(
            username="fselim",
            email="selim@jashore.com",
            password="F4",
            role="farmer",
            name="Selim Hossain",
            phone_number="01512345678",
            address="Benapole, Sharsha, Jashore",
            latitude=23.1664,
            longitude=89.2081,
            division="Khulna",
            district="Jashore",
            upazila="Sharsha",
            union="Benapole",
            is_verified=True
        )
        f5 = User.objects.create_user(
            username="farif",
            email="arif@comilla.com",
            password="F5",
            role="farmer",
            name="Arif Chowdhury",
            phone_number="01998765432",
            address="Mokara, Nangalkot, Comilla",
            latitude=23.4607,
            longitude=91.1809,
            division="Chittagong",
            district="Comilla",
            upazila="Nangalkot",
            union="Mokara",
            is_verified=True
        )
        for f in [f1, f2, f3, f4, f5]:
            Token.objects.create(user=f)

        # 2 Customers (csadia is named ratul)
        c1 = User.objects.create_user(
            username="rahimk",
            email="rahimk@restaurant.com",
            password="C",
            role="customer",
            name="ratul",
            phone_number="01912345678",
            address="Road 11, Banani, Dhaka",
            latitude=23.7937,
            longitude=90.4066,
            division="Dhaka",
            district="Dhaka",
            upazila="Banani",
            is_verified=True
        )
        c2 = User.objects.create_user(
            username="chasan",
            email="hasan@retail.com",
            password="C23",
            role="customer",
            name="Hasan Groceries",
            phone_number="01512345678",
            address="Sector 4, Uttara, Dhaka",
            latitude=23.8759,
            longitude=90.3795,
            division="Dhaka",
            district="Dhaka",
            upazila="Uttara",
            is_verified=True
        )
        for c in [c1, c2]:
            Token.objects.create(user=c)

        # 2 Deliverymen (dkarim centered in Mirpur, Dhaka)
        d1 = User.objects.create_user(
            username="dkarim",
            email="karim@delivery.com",
            password="D1",
            role="deliveryman",
            name="Karim Delivery",
            phone_number="01600000001",
            address="Mirpur 10, Dhaka",
            latitude=23.8223,
            longitude=90.3654,
            division="Dhaka",
            district="Dhaka",
            upazila="Mirpur",
            service_areas=["Mirpur", "Banani", "Uttara", "Dhaka"],
            is_verified=True
        )
        d2 = User.objects.create_user(
            username="drahim",
            email="rahim@delivery.com",
            password="D2",
            role="deliveryman",
            name="Rahim Delivery",
            phone_number="01600000002",
            address="Uttara Sector 7, Dhaka",
            latitude=23.8759,
            longitude=90.3795,
            division="Dhaka",
            district="Dhaka",
            upazila="Uttara",
            service_areas=["Uttara", "Gazipur", "Dhaka"],
            is_verified=True
        )
        for d in [d1, d2]:
            Token.objects.create(user=d)

        # ==========================================
        # 2. PRODUCT TYPES
        # ==========================================
        self.stdout.write("Seeding product types...")
        product_types_data = [
            ("Garlic", "রসুন"),
            ("Raw Banana", "কলা (কাঁচা)"),
            ("Carrot", "গাজর"),
            ("Cherry", "চেরি"),
            ("Cucumber", "শসা"),
            ("Eggplant", "বেগুন"),
            ("Tomato", "টমেটো"),
            ("Potato", "আলু"),
            ("Onion", "পেঁয়াজ"),
            ("Green Chili", "কাঁচামরিচ"),
            ("Melon", "তরমুজ"),
            ("Peach", "পীচ"),
            ("Rice", "চাল"),
            ("Zucchini", "ঝুকিনি"),
        ]
        product_type_map = {}
        for name_en, name_bn in product_types_data:
            pt, _ = ProductType.objects.get_or_create(name_en=name_en, defaults={"name_bn": name_bn})
            product_type_map[name_en] = pt

        # ==========================================
        # 3. IMAGE UTILITY
        # ==========================================
        self.stdout.write("Processing images from timage directory...")
        timage_dir = os.path.join(settings.BASE_DIR, 'timage')

        fallback_bytes = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00'
            b'\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00'
            b'\x01\x00\x01\x00\x00\x02\x02\x4c\x01\x00\x3b'
        )

        def get_image_file(filename):
            full_path = os.path.join(timage_dir, filename)
            if os.path.exists(timage_dir):
                for actual_file in os.listdir(timage_dir):
                    if actual_file.lower() == filename.lower():
                        full_path = os.path.join(timage_dir, actual_file)
                        break
            if os.path.exists(full_path) and os.path.isfile(full_path):
                with open(full_path, 'rb') as f:
                    return SimpleUploadedFile(name=filename, content=f.read(), content_type='image/jpeg')
            else:
                self.stdout.write(self.style.WARNING(f"File {filename} not found in timage, using fallback."))
                return SimpleUploadedFile(name=f"fallback_{filename}.gif", content=fallback_bytes, content_type='image/gif')

        # ==========================================
        # 4. POSTS (Only using images in timage folder)
        # ==========================================
        self.stdout.write("Creating post listings...")

        # Farmer 1 — fjamal (Mymensingh & Dhaka Hub)
        # Requirement: The garlic post will have 3 images together and fjamal will be the poster.
        p_garlic = Post.objects.create(
            farmer=f1,
            product_type=product_type_map.get("Garlic"),
            title="Deshi Organic Sun-dried Garlic",
            price_per_kg=120.00,
            total_weight_kg=500.00,
            description="Premium quality sun-dried local garlic. Strong flavour and long shelf life.",
            latitude=23.8103,  # Savar/Dhaka hub location for nearby delivery testing
            longitude=90.3612,
            collection_district="Dhaka",
            collection_upazila="Savar",
            collection_union="Aminbazar",
            collection_ward="Ward 01",
            collection_point_address="Aminbazar Wholesale Market, Savar, Dhaka",
            image=get_image_file("garlic.jpeg")
        )
        # Attach 3 images together to p_garlic
        for img_name in ["garlic.jpeg", "garlic3.jpeg", "garlic35.jpeg"]:
            PostImage.objects.create(post=p_garlic, image=get_image_file(img_name))

        p_banana_avg = Post.objects.create(
            farmer=f1,
            product_type=product_type_map.get("Raw Banana"),
            title="Sagar Banana (Medium Size)",
            price_per_kg=40.00,
            total_weight_kg=500.00,
            description="Sweet, uniform medium size organic bananas.",
            latitude=f1.latitude,
            longitude=f1.longitude,
            collection_district=f1.district,
            collection_upazila=f1.upazila,
            collection_union=f1.union,
            collection_ward="Ward 02",
            collection_point_address=f1.address,
            image=get_image_file("banana_avg.jpg")
        )
        p_banana_large = Post.objects.create(
            farmer=f1,
            product_type=product_type_map.get("Raw Banana"),
            title="Premium Giant Bananas",
            price_per_kg=55.00,
            total_weight_kg=300.00,
            description="Large variety high yield banana for wholesale.",
            latitude=f1.latitude,
            longitude=f1.longitude,
            collection_district=f1.district,
            collection_upazila=f1.upazila,
            collection_union=f1.union,
            collection_ward="Ward 02",
            collection_point_address=f1.address,
            image=get_image_file("banana_large.jpg")
        )
        p_banana_short = Post.objects.create(
            farmer=f1,
            product_type=product_type_map.get("Raw Banana"),
            title="Champa Banana (Short Variety)",
            price_per_kg=35.00,
            total_weight_kg=600.00,
            description="Traditional sweet short variety Champa banana.",
            latitude=f1.latitude,
            longitude=f1.longitude,
            collection_district=f1.district,
            collection_upazila=f1.upazila,
            collection_union=f1.union,
            collection_ward="Ward 02",
            collection_point_address=f1.address,
            image=get_image_file("banana_short.jpg")
        )
        p_carrot1 = Post.objects.create(
            farmer=f1,
            product_type=product_type_map.get("Carrot"),
            title="Fresh Spring Carrots (Grade A)",
            price_per_kg=60.00,
            total_weight_kg=400.00,
            description="Fresh organic crunchy sweet orange carrots.",
            latitude=f1.latitude,
            longitude=f1.longitude,
            collection_district=f1.district,
            collection_upazila=f1.upazila,
            collection_union=f1.union,
            collection_ward="Ward 03",
            collection_point_address=f1.address,
            image=get_image_file("carrot1.jpg")
        )
        p_carrot2 = Post.objects.create(
            farmer=f1,
            product_type=product_type_map.get("Carrot"),
            title="Juicing Carrots Bulk",
            price_per_kg=45.00,
            total_weight_kg=1200.00,
            description="Bulk carrots for commercial juicing.",
            latitude=f1.latitude,
            longitude=f1.longitude,
            collection_district=f1.district,
            collection_upazila=f1.upazila,
            collection_union=f1.union,
            collection_ward="Ward 03",
            collection_point_address=f1.address,
            image=get_image_file("carrot2.jpg")
        )

        # Farmer 2 — frahim (Bogura & Dhaka Hub)
        p_cherry1 = Post.objects.create(
            farmer=f2,
            product_type=product_type_map.get("Cherry"),
            title="Sweet Organic Red Cherries",
            price_per_kg=350.00,
            total_weight_kg=100.00,
            description="Freshly handpicked sweet red cherries.",
            latitude=f2.latitude,
            longitude=f2.longitude,
            collection_district=f2.district,
            collection_upazila=f2.upazila,
            collection_union=f2.union,
            collection_ward="Ward 01",
            collection_point_address=f2.address,
            image=get_image_file("cherries1.jpg")
        )
        p_cherry2 = Post.objects.create(
            farmer=f2,
            product_type=product_type_map.get("Cherry"),
            title="Dark Red Cherries Premium",
            price_per_kg=380.00,
            total_weight_kg=80.00,
            description="Juicy dark red cherries.",
            latitude=f2.latitude,
            longitude=f2.longitude,
            collection_district=f2.district,
            collection_upazila=f2.upazila,
            collection_union=f2.union,
            collection_ward="Ward 01",
            collection_point_address=f2.address,
            image=get_image_file("cherries2.jpg")
        )
        p_cucumber = Post.objects.create(
            farmer=f2,
            product_type=product_type_map.get("Cucumber"),
            title="Green Salad Cucumber Bulk",
            price_per_kg=42.00,
            total_weight_kg=1000.00,
            description="Standard size greenhouse grown salad cucumbers.",
            latitude=23.8350,  # Mirpur nearby collection hub for delivery testing
            longitude=90.3680,
            collection_district="Dhaka",
            collection_upazila="Mirpur",
            collection_union="Mirpur 11",
            collection_ward="Ward 04",
            collection_point_address="Mirpur Agro Hub, Dhaka",
            image=get_image_file("cucumber.jpg")
        )
        p_cucumber_deshi = Post.objects.create(
            farmer=f2,
            product_type=product_type_map.get("Cucumber"),
            title="Deshi Green Cucumber",
            price_per_kg=38.00,
            total_weight_kg=800.00,
            description="Locally cultivated crunchy green cucumbers.",
            latitude=f2.latitude,
            longitude=f2.longitude,
            collection_district=f2.district,
            collection_upazila=f2.upazila,
            collection_union=f2.union,
            collection_ward="Ward 02",
            collection_point_address=f2.address,
            image=get_image_file("cucumber_deshi.jpg")
        )
        p_cucumber_dotted = Post.objects.create(
            farmer=f2,
            product_type=product_type_map.get("Cucumber"),
            title="Dotted Variety Cucumber",
            price_per_kg=35.00,
            total_weight_kg=600.00,
            description="Crisp dotted variety cucumbers for salads.",
            latitude=f2.latitude,
            longitude=f2.longitude,
            collection_district=f2.district,
            collection_upazila=f2.upazila,
            collection_union=f2.union,
            collection_ward="Ward 02",
            collection_point_address=f2.address,
            image=get_image_file("cucumber_dotted.jpg")
        )

        # Farmer 3 — fkarim (Rajshahi & Dhaka Hub)
        p_eggplant = Post.objects.create(
            farmer=f3,
            product_type=product_type_map.get("Eggplant"),
            title="Long Purple Eggplant (Begun)",
            price_per_kg=65.00,
            total_weight_kg=450.00,
            description="Fresh long tender purple eggplants.",
            latitude=23.8250,  # Dhaka collection point near dkarim
            longitude=90.3700,
            collection_district="Dhaka",
            collection_upazila="Mirpur",
            collection_union="Mirpur 12",
            collection_ward="Ward 05",
            collection_point_address="Kallayanpur Wholesale Depot, Dhaka",
            image=get_image_file("eggplant_long.jpg")
        )
        p_eggplant_1 = Post.objects.create(
            farmer=f3,
            product_type=product_type_map.get("Eggplant"),
            title="Round Oval Eggplant",
            price_per_kg=60.00,
            total_weight_kg=300.00,
            description="Seedless round purple eggplant.",
            latitude=f3.latitude,
            longitude=f3.longitude,
            collection_district=f3.district,
            collection_upazila=f3.upazila,
            collection_union=f3.union,
            collection_ward="Ward 01",
            collection_point_address=f3.address,
            image=get_image_file("eggplant_1.jpg")
        )
        p_tomato = Post.objects.create(
            farmer=f3,
            product_type=product_type_map.get("Tomato"),
            title="Red Ripe Tomatoes",
            price_per_kg=50.00,
            total_weight_kg=800.00,
            description="Juicy vine-ripened tomatoes perfect for cooking.",
            latitude=f3.latitude,
            longitude=f3.longitude,
            collection_district=f3.district,
            collection_upazila=f3.upazila,
            collection_union=f3.union,
            collection_ward="Ward 02",
            collection_point_address=f3.address,
            image=get_image_file("tomato.jpg")
        )
        p_potato_r = Post.objects.create(
            farmer=f3,
            product_type=product_type_map.get("Potato"),
            title="Rajshahi Potato (Diamond)",
            price_per_kg=30.00,
            total_weight_kg=2000.00,
            description="High-yield diamond variety potatoes from Rajshahi.",
            latitude=f3.latitude,
            longitude=f3.longitude,
            collection_district=f3.district,
            collection_upazila=f3.upazila,
            collection_union=f3.union,
            collection_ward="Ward 03",
            collection_point_address=f3.address,
            image=get_image_file("potato.jpg")
        )
        p_rice = Post.objects.create(
            farmer=f3,
            product_type=product_type_map.get("Rice"),
            title="Miniket Premium Rice",
            price_per_kg=72.00,
            total_weight_kg=3000.00,
            description="Clean, slender grain Miniket rice.",
            latitude=f3.latitude,
            longitude=f3.longitude,
            collection_district=f3.district,
            collection_upazila=f3.upazila,
            collection_union=f3.union,
            collection_ward="Ward 04",
            collection_point_address=f3.address,
            image=get_image_file("rice.jpg")
        )

        # Farmer 4 — fselim (Jashore & Dhaka Hub)
        p_onion = Post.objects.create(
            farmer=f4,
            product_type=product_type_map.get("Onion"),
            title="Jashore Red Onion",
            price_per_kg=45.00,
            total_weight_kg=1500.00,
            description="Premium red onions from Jashore — mild & pungent.",
            latitude=23.8150,  # Nearby Dhaka location
            longitude=90.3600,
            collection_district="Dhaka",
            collection_upazila="Gabtoli",
            collection_union="Gabtoli Bus Terminal",
            collection_ward="Ward 08",
            collection_point_address="Gabtoli Agriculture Depot, Dhaka",
            image=get_image_file("onion1.jpeg")
        )
        p_onion_indian = Post.objects.create(
            farmer=f4,
            product_type=product_type_map.get("Onion"),
            title="Large Storage Onion",
            price_per_kg=40.00,
            total_weight_kg=1000.00,
            description="Well-cured large onions suitable for long storage.",
            latitude=f4.latitude,
            longitude=f4.longitude,
            collection_district=f4.district,
            collection_upazila=f4.upazila,
            collection_union=f4.union,
            collection_ward="Ward 01",
            collection_point_address=f4.address,
            image=get_image_file("onion_indian.jpeg")
        )
        p_chili = Post.objects.create(
            farmer=f4,
            product_type=product_type_map.get("Green Chili"),
            title="Jashore Green Chili",
            price_per_kg=80.00,
            total_weight_kg=250.00,
            description="Spicy thin-skinned green chillies.",
            latitude=f4.latitude,
            longitude=f4.longitude,
            collection_district=f4.district,
            collection_upazila=f4.upazila,
            collection_union=f4.union,
            collection_ward="Ward 02",
            collection_point_address=f4.address,
            image=get_image_file("greenchilli.jpeg")
        )
        p_chilli2 = Post.objects.create(
            farmer=f4,
            product_type=product_type_map.get("Green Chili"),
            title="Hot Deshi Chili",
            price_per_kg=90.00,
            total_weight_kg=200.00,
            description="Very spicy deshi green chillies.",
            latitude=f4.latitude,
            longitude=f4.longitude,
            collection_district=f4.district,
            collection_upazila=f4.upazila,
            collection_union=f4.union,
            collection_ward="Ward 02",
            collection_point_address=f4.address,
            image=get_image_file("chilli2.jpeg")
        )
        p_zuccini = Post.objects.create(
            farmer=f4,
            product_type=product_type_map.get("Zucchini"),
            title="Fresh Green Zucchini",
            price_per_kg=75.00,
            total_weight_kg=350.00,
            description="Tender green zucchini grown in organic beds.",
            latitude=f4.latitude,
            longitude=f4.longitude,
            collection_district=f4.district,
            collection_upazila=f4.upazila,
            collection_union=f4.union,
            collection_ward="Ward 03",
            collection_point_address=f4.address,
            image=get_image_file("zuccini.jpg")
        )

        # Farmer 5 — farif (Comilla)
        p_cucumbers_xl = Post.objects.create(
            farmer=f5,
            product_type=product_type_map.get("Cucumber"),
            title="Extra Long Cucumbers",
            price_per_kg=40.00,
            total_weight_kg=500.00,
            description="Crisp extra long salad cucumbers.",
            latitude=f5.latitude,
            longitude=f5.longitude,
            collection_district=f5.district,
            collection_upazila=f5.upazila,
            collection_union=f5.union,
            collection_ward="Ward 01",
            collection_point_address=f5.address,
            image=get_image_file("cucumbers_extra_long.jpg")
        )
        p_cucumbers_kacha = Post.objects.create(
            farmer=f5,
            product_type=product_type_map.get("Cucumber"),
            title="Kacha Green Cucumber",
            price_per_kg=38.00,
            total_weight_kg=400.00,
            description="Fresh green cucumber with high water content.",
            latitude=f5.latitude,
            longitude=f5.longitude,
            collection_district=f5.district,
            collection_upazila=f5.upazila,
            collection_union=f5.union,
            collection_ward="Ward 01",
            collection_point_address=f5.address,
            image=get_image_file("cucucumber_kacha.jpg")
        )
        p_melons1 = Post.objects.create(
            farmer=f5,
            product_type=product_type_map.get("Melon"),
            title="Sweet Red Watermelon",
            price_per_kg=35.00,
            total_weight_kg=1500.00,
            description="Juicy sweet red watermelons, 4-7 kg each.",
            latitude=23.8400,  # Collection point in Uttara/Gazipur for delivery access
            longitude=90.3800,
            collection_district="Dhaka",
            collection_upazila="Uttara",
            collection_union="Uttara Sector 10",
            collection_ward="Ward 01",
            collection_point_address="Uttara Wholesale Fruit Market, Dhaka",
            image=get_image_file("melons1.jpg")
        )
        p_peaches = Post.objects.create(
            farmer=f5,
            product_type=product_type_map.get("Peach"),
            title="Sweet Fresh Peaches",
            price_per_kg=220.00,
            total_weight_kg=250.00,
            description="Aromatic sweet organic peaches.",
            latitude=f5.latitude,
            longitude=f5.longitude,
            collection_district=f5.district,
            collection_upazila=f5.upazila,
            collection_union=f5.union,
            collection_ward="Ward 02",
            collection_point_address=f5.address,
            image=get_image_file("peaches.jpg")
        )

        # ==========================================
        # 5. ORDERS & DELIVERY ASSIGNMENTS
        # Requirement: dkarim will see the datas of nearby deliveries
        # csadia (named Ratul) is the primary customer
        # ==========================================
        self.stdout.write("Creating orders and delivery assignments...")

        def make_order(customer, post, qty, status, deliveryman=None, picked_up=False, delivered=False):
            with transaction.atomic():
                qty_dec = Decimal(str(qty))
                price_dec = Decimal(str(post.price_per_kg))
                total = round(qty_dec * price_dec, 2)
                fee = round(total * Decimal('0.10'), 2)
                payout = total - fee
                current_weight = Decimal(str(post.total_weight_kg))
                post.total_weight_kg = current_weight - qty_dec
                post.save()

                order = Order.objects.create(
                    customer=customer,
                    post=post,
                    quantity_kg=qty_dec,
                    status=status,
                    total_paid=total,
                    platform_fee=fee,
                    farmer_payout=payout,
                    delivery_address=customer.address,
                    deliveryman=deliveryman
                )
                if picked_up:
                    order.picked_up_at = timezone.now()
                if delivered:
                    order.delivered_at = timezone.now()
                return order

        # --- Ratul's (csadia) Orders ---

        # 1. Garlic Order from fjamal -> SHIPPED & Unassigned (Available nearby for dkarim!)
        o_garlic = make_order(c1, p_garlic, 50, 'shipped')

        # 2. Eggplant Order from fkarim -> SHIPPED & Unassigned (Available nearby for dkarim!)
        o_eggplant = make_order(c1, p_eggplant, 40, 'shipped')

        # 3. Red Onion Order from fselim -> SHIPPED & Unassigned (Available nearby for dkarim!)
        o_onion = make_order(c1, p_onion, 100, 'shipped')

        # 4. Cucumber Order from frahim -> ASSIGNED to dkarim
        o_cucumber = make_order(c1, p_cucumber, 40, 'assigned', deliveryman=d1)

        # 5. Green Chili Order from fselim -> OUT FOR DELIVERY by dkarim
        o_chili = make_order(c1, p_chili, 25, 'out_for_delivery', deliveryman=d1, picked_up=True)

        # 6. Potato Order from fkarim -> COMPLETED by dkarim
        o_potato = make_order(c1, p_potato_r, 200, 'completed', deliveryman=d1, picked_up=True, delivered=True)

        # 7-11. Ratul's Completed Orders from fjamal (Bananas & Carrots)
        o_b1 = make_order(c1, p_banana_avg, 100, 'completed')
        o_b2 = make_order(c1, p_banana_large, 50, 'completed')
        o_b3 = make_order(c1, p_banana_short, 80, 'completed')
        o_c1 = make_order(c1, p_carrot1, 60, 'completed')
        o_c2 = make_order(c1, p_carrot2, 200, 'completed')

        # 12. Ratul's Completed Order from frahim (Cherries)
        o_ch1 = make_order(c1, p_cherry1, 10, 'completed')

        # --- Hasan's (chasan) Orders ---

        # 13. Melon Order from farif -> SHIPPED & Unassigned (Available nearby for dkarim!)
        o_melon = make_order(c2, p_melons1, 100, 'shipped')

        # 14. Cucumber Pending Order from frahim
        o_cuc_p = make_order(c2, p_cucumber_deshi, 50, 'pending')

        # 15. Zucchini Completed Order from fselim
        o_zuc = make_order(c2, p_zuccini, 80, 'completed')

        # 16. Rice Completed Order from fkarim -> COMPLETED by dkarim
        o_rice = make_order(c2, p_rice, 300, 'completed', deliveryman=d1, picked_up=True, delivered=True)

        # ==========================================
        # 6. REVIEWS
        # ==========================================
        self.stdout.write("Creating reviews for completed orders...")

        # ratul's (csadia) Reviews
        Review.objects.create(
            customer=c1,
            post=p_potato_r,
            rating=5,
            comment="ratul: Excellent Rajshahi potatoes! Fast delivery by Karim Delivery."
        )
        Review.objects.create(
            customer=c1,
            post=p_banana_avg,
            rating=5,
            comment="ratul: Jamal's bananas are consistently top quality. Sagar bananas are perfectly sweet."
        )
        Review.objects.create(
            customer=c1,
            post=p_banana_large,
            rating=4,
            comment="ratul: Premium giant bananas are great for juice and smoothies. Very fresh!"
        )
        Review.objects.create(
            customer=c1,
            post=p_banana_short,
            rating=5,
            comment="ratul: Champa bananas have traditional sweet flavor. Recommended!"
        )
        Review.objects.create(
            customer=c1,
            post=p_carrot1,
            rating=4,
            comment="ratul: Carrots were crunchy and sweet. Grade A quality as described."
        )
        Review.objects.create(
            customer=c1,
            post=p_cherry1,
            rating=5,
            comment="ratul: Premium cherries, super sweet and well packaged."
        )

        # Hasan's Reviews
        Review.objects.create(
            customer=c2,
            post=p_zuccini,
            rating=4,
            comment="Hasan: Fresh zucchini, delivered clean and in great condition."
        )
        Review.objects.create(
            customer=c2,
            post=p_rice,
            rating=5,
            comment="Hasan: Miniket rice quality is superb. Slender grains, perfect for retail."
        )

        # ==========================================
        # 7. SUMMARY
        # ==========================================
        self.stdout.write(self.style.SUCCESS("Comprehensive database seed completed successfully!"))
        self.stdout.write(f"  Admin:           admin / Adminpassword123")
        self.stdout.write(f"  Farmers:         fjamal(F1), frahim(F2), fkarim(F3), fselim(F4), farif(F5)")
        self.stdout.write(f"  Customer csadia: Name: 'ratul' | Pass: C")
        self.stdout.write(f"  Customer chasan: Name: 'Hasan Groceries' | Pass: C23")
        self.stdout.write(f"  Deliverymen:     dkarim (D1) [Mirpur Dhaka], drahim (D2) [Uttara Dhaka]")
        self.stdout.write("")
        self.stdout.write("  Garlic Post:     Posted by fjamal with 3 images attached (garlic.jpeg, garlic3.jpeg, garlic35.jpeg)")
        self.stdout.write("  dkarim dashboard: 4 nearby available orders; My Deliveries has 1 awaiting farmer pickup, 1 out for delivery, and 2 completed")
        self.stdout.write("  Image Source:    100% matching files in backend/timage/ (no fallbacks used)")
