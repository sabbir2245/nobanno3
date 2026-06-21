import os
from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.authtoken.models import Token
from api.models import Post, Order, Review
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with test data matching images inside the timage folder."

    def handle(self, *args, **options):
        self.stdout.write("Clearing existing database...")
        Review.objects.all().delete()
        Order.objects.all().delete()
        Post.objects.all().delete()
        User.objects.all().delete()
        Token.objects.all().delete()

        # ==========================================
        # 1. CREATING USERS
        # ==========================================
        self.stdout.write("Creating users (1 Admin, 5 Farmers, 2 Customers)...")

        # Admin (unchanged)
        admin_user = User.objects.create_superuser(
            username="admin", email="admin@nobanno.gov.bd", password="adminpassword123",
            role="admin", name="Super Admin", phone_number="01000000000",
            address="Dhaka Secretariat", latitude=23.7291, longitude=90.4087, is_verified=True
        )
        Token.objects.create(user=admin_user)

        # 5 Farmers (unchanged)
        f1 = User.objects.create_user(
            username="fjamal", email="jamal@farms.com", password="f1",
            role="farmer", name="Jamal Uddin", phone_number="01712345678",
            address="Mymensingh Sadar, Mymensingh", latitude=24.7578, longitude=90.4003, is_verified=True
        )
        f2 = User.objects.create_user(
            username="frahim", email="rahim@bogura.com", password="f2",
            role="farmer", name="Rahim Mia", phone_number="01812345678",
            address="Sherpur, Bogura", latitude=24.8481, longitude=89.3730, is_verified=True
        )
        f3 = User.objects.create_user(
            username="fkarim", email="karim@rajshahi.com", password="f3",
            role="farmer", name="Karim Ahmed", phone_number="01612345678",
            address="Paba, Rajshahi", latitude=24.3745, longitude=88.6042, is_verified=True
        )
        f4 = User.objects.create_user(
            username="fselim", email="selim@jashore.com", password="f4",
            role="farmer", name="Selim Hossain", phone_number="01512345678",
            address="Benapole, Jashore", latitude=23.1664, longitude=89.2081, is_verified=True
        )
        f5 = User.objects.create_user(
            username="farif", email="arif@comilla.com", password="f5",
            role="farmer", name="Arif Chowdhury", phone_number="01998765432",
            address="Nangalkot, Comilla", latitude=23.4607, longitude=91.1809, is_verified=True
        )
        for f in [f1, f2, f3, f4, f5]:
            Token.objects.create(user=f)

        # 2 Customers (unchanged)
        c1 = User.objects.create_user(
            username="csadia", email="sadia@restaurant.com", password="c123",
            role="customer", name="Sadia's Kitchen", phone_number="01912345678",
            address="Road 11, Banani, Dhaka", latitude=23.7937, longitude=90.4066,
            balance=100000.00, is_verified=True
        )
        c2 = User.objects.create_user(
            username="chasan", email="hasan@retail.com", password="c23",
            role="customer", name="Hasan Groceries", phone_number="01512345678",
            address="Sector 4, Uttara, Dhaka", latitude=23.8759, longitude=90.3795,
            balance=35000.00, is_verified=True
        )
        for c in [c1, c2]:
            Token.objects.create(user=c)

        # ==========================================
        # 2. IMAGE UTILITY
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
                self.stdout.write(self.style.WARNING(f"File {filename} not found, using fallback."))
                return SimpleUploadedFile(name=f"fallback_{filename}.gif", content=fallback_bytes, content_type='image/gif')

        # ==========================================
        # 3. POSTS
        # ==========================================
        self.stdout.write("Creating listings...")

        # Farmer 1 — fjamal (5 posts)
        p_banana_avg = Post.objects.create(
            farmer=f1, title="Sagar Banana (Medium Size)", price_per_kg=40.00, total_weight_kg=500.00,
            description="Sweet, uniform medium size organic bananas.",
            latitude=f1.latitude, longitude=f1.longitude, image=get_image_file("banana_avg.jpg"))
        p_banana_large = Post.objects.create(
            farmer=f1, title="Premium Giant Bananas", price_per_kg=55.00, total_weight_kg=300.00,
            description="Large variety high yield banana for wholesale.",
            latitude=f1.latitude, longitude=f1.longitude, image=get_image_file("banana_large.jpg"))
        p_banana_short = Post.objects.create(
            farmer=f1, title="Champa Banana (Short Variety)", price_per_kg=35.00, total_weight_kg=600.00,
            description="Traditional sweet short variety Champa banana.",
            latitude=f1.latitude, longitude=f1.longitude, image=get_image_file("banana_short.jpg"))
        p_carrot1 = Post.objects.create(
            farmer=f1, title="Fresh Spring Carrots (Grade A)", price_per_kg=60.00, total_weight_kg=400.00,
            description="Fresh organic crunchy sweet orange carrots.",
            latitude=f1.latitude, longitude=f1.longitude, image=get_image_file("carrot1.jpg"))
        p_carrot2 = Post.objects.create(
            farmer=f1, title="Juicing Carrots Bulk", price_per_kg=45.00, total_weight_kg=1200.00,
            description="Bulk carrots for commercial juicing.",
            latitude=f1.latitude, longitude=f1.longitude, image=get_image_file("carrot2.jpg"))

        # Farmer 2 — frahim (existing posts)
        p_cherry1 = Post.objects.create(
            farmer=f2, title="Sweet Organic Red Cherries", price_per_kg=350.00, total_weight_kg=100.00,
            description="Freshly handpicked sweet red cherries.",
            latitude=f2.latitude, longitude=f2.longitude, image=get_image_file("cherries1.jpg"))
        p_cucumber = Post.objects.create(
            farmer=f2, title="Green Salad Cucumber Bulk", price_per_kg=42.00, total_weight_kg=1000.00,
            description="Standard size greenhouse grown salad cucumbers.",
            latitude=f2.latitude, longitude=f2.longitude, image=get_image_file("cucumber.jpg"))

        # Farmer 3 — fkarim (for csadia's shipped order)
        p_eggplant = Post.objects.create(
            farmer=f3, title="Long Purple Eggplant (Begun)", price_per_kg=65.00, total_weight_kg=450.00,
            description="Fresh long tender purple eggplants.",
            latitude=f3.latitude, longitude=f3.longitude, image=get_image_file("eggplant_long.jpg"))

        # ==========================================
        # 4. ORDERS for csadia
        # ==========================================
        self.stdout.write("Creating csadia orders (5 completed with fjamal, 1 shipped with fkarim)...")

        def make_order(customer, post, qty, status):
            with transaction.atomic():
                total = round(qty * post.price_per_kg, 2)
                fee = round(total * 0.10, 2)
                payout = total - fee
                customer.balance -= total
                customer.save()
                post.total_weight_kg -= qty
                post.save()
                farmer = post.farmer
                if status == 'completed':
                    farmer.balance += payout
                    farmer.save()
                return Order.objects.create(
                    customer=customer, post=post, quantity_kg=qty, status=status,
                    total_paid=total, platform_fee=fee, farmer_payout=payout,
                    delivery_address=customer.address
                )

        # csadia's 5 completed orders from fjamal (one for each of his posts)
        o1 = make_order(c1, p_banana_avg, 100, 'completed')
        o2 = make_order(c1, p_banana_large, 50, 'completed')
        o3 = make_order(c1, p_banana_short, 80, 'completed')
        o4 = make_order(c1, p_carrot1, 60, 'completed')
        o5 = make_order(c1, p_carrot2, 200, 'completed')

        # csadia's shipped order from fkarim (awaiting delivery confirmation + review)
        o6 = make_order(c1, p_eggplant, 40, 'shipped')

        # csadia also bought from frahim (completed + reviewed)
        o7 = make_order(c1, p_cherry1, 10, 'completed')

        # ==========================================
        # 5. REVIEWS for csadia (per-post)
        # ==========================================
        self.stdout.write("Creating reviews for csadia's completed orders...")

        # Each review is tied to a specific purchased post
        Review.objects.create(
            customer=c1, post=p_banana_avg, rating=5,
            comment="Jamal's bananas are consistently excellent. The Sagar bananas are sweet and perfectly sized for my restaurant desserts."
        )
        Review.objects.create(
            customer=c1, post=p_banana_large, rating=4,
            comment="Premium giant bananas are great for smoothies. Very fresh and well-packed."
        )
        Review.objects.create(
            customer=c1, post=p_banana_short, rating=5,
            comment="Champa bananas are a hit with customers. Sweet traditional flavor."
        )
        Review.objects.create(
            customer=c1, post=p_carrot1, rating=4,
            comment="Carrots were crunchy and fresh. Grade A quality as described."
        )
        # NOTE: o5 (Juicing Carrots Bulk, 200kg) is completed but NOT reviewed —
        # csadia can still review p_carrot2

        # Review for frahim's cherries
        Review.objects.create(
            customer=c1, post=p_cherry1, rating=5,
            comment="Excellent quality cherries, perfect for my bakery toppings!"
        )

        # ==========================================
        # 6. chasan's pending order (existing)
        # ==========================================
        self.stdout.write("Creating chasan's pending order...")
        make_order(c2, p_cucumber, 50, 'pending')

        # ==========================================
        # 7. SUMMARY
        # ==========================================
        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
        self.stdout.write(f"  Admin:           admin / adminpassword123")
        self.stdout.write(f"  Farmers:         fjamal(f1), frahim(f2), fkarim(f3), fselim(f4), farif(f5)")
        self.stdout.write(f"  Passwords:       f1, f2, f3, f4, f5")
        self.stdout.write(f"  Customers:       csadia(c123), chasan(c23)")
        self.stdout.write("")
        self.stdout.write("  csadia -> fjamal:  5 completed orders (4 reviewed, 1 unreviewed)")
        self.stdout.write("  csadia -> fkarim:  1 SHIPPED order — confirm & review")
        self.stdout.write("  csadia -> frahim:  1 completed order, 1 review on cherries")
        self.stdout.write("  chasan -> frahim:  1 pending order (ship & complete to review)")
