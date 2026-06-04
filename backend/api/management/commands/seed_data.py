from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from api.models import Post, Order, Review
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with test data for Nobanno agricultural marketplace."

    def handle(self, *args, **options):
        self.stdout.write("Clearing existing database...")
        Review.objects.all().delete()
        Order.objects.all().delete()
        Post.objects.all().delete()
        User.objects.all().delete()
        Token.objects.all().delete()

        self.stdout.write("Creating users...")

        # 1. Admin
        admin_user = User.objects.create_superuser(
            username="admin",
            email="admin@nobanno.gov.bd",
            password="adminpassword123",
            role="admin",
            name="Super Admin",
            phone_number="01000000000",
            address="Dhaka Secretariat",
            latitude=23.7291,
            longitude=90.4087,
            is_verified=True
        )
        Token.objects.create(user=admin_user)

        # 2. Farmers
        farmer_jamal = User.objects.create_user(
            username="farmer_jamal",
            email="jamal@farms.com",
            password="farmerpassword123",
            role="farmer",
            name="Jamal Uddin",
            phone_number="01712345678",
            address="Mymensingh Sadar, Mymensingh",
            latitude=24.7578,
            longitude=90.4003,
            is_verified=True
        )
        Token.objects.create(user=farmer_jamal)

        farmer_rahim = User.objects.create_user(
            username="farmer_rahim",
            email="rahim@bogura.com",
            password="farmerpassword123",
            role="farmer",
            name="Rahim Mia",
            phone_number="01812345678",
            address="Sherpur, Bogura",
            latitude=24.8481,
            longitude=89.3730,
            is_verified=True
        )
        Token.objects.create(user=farmer_rahim)

        # 3. Customers
        customer_sadia = User.objects.create_user(
            username="customer_sadia",
            email="sadia@restaurant.com",
            password="customerpassword123",
            role="customer",
            name="Sadia's Kitchen",
            phone_number="01912345678",
            address="Road 11, Banani, Dhaka",
            latitude=23.7937,
            longitude=90.4066,
            balance=15000.00,
            is_verified=True
        )
        Token.objects.create(user=customer_sadia)

        customer_hasan = User.objects.create_user(
            username="customer_hasan",
            email="hasan@retail.com",
            password="customerpassword123",
            role="customer",
            name="Hasan Groceries",
            phone_number="01512345678",
            address="Sector 4, Uttara, Dhaka",
            latitude=23.8759,
            longitude=90.3795,
            balance=8000.00,
            is_verified=True
        )
        Token.objects.create(user=customer_hasan)

        self.stdout.write("Creating crop listings (Posts)...")

        post_rice = Post.objects.create(
            farmer=farmer_jamal,
            title="Premium Organic Miniket Rice",
            description="Pure organic Miniket rice harvested directly from rural Mymensingh. High nutritional value, chemical-free processing, packaged in bulk 50kg bags.",
            total_weight_kg=1200.00,
            price_per_kg=65.00,
            latitude=24.7578,
            longitude=90.4003
        )

        post_potato = Post.objects.create(
            farmer=farmer_jamal,
            title="Fresh Diamond Potatoes",
            description="High-quality Diamond potatoes, sorted by size. Cleaned and stored in airy mesh sacks, ideal for supermarkets or restaurants.",
            total_weight_kg=1000.00,
            price_per_kg=38.00,
            latitude=24.7578,
            longitude=90.4003
        )

        post_curd = Post.objects.create(
            farmer=farmer_rahim,
            title="Traditional Bogura Curd (Doi)",
            description="Authentic sweet curd from Bogura, prepared using pure cow milk and traditional earthen pots. Premium taste, rich texture.",
            total_weight_kg=150.00,
            price_per_kg=220.00,
            latitude=24.8481,
            longitude=89.3730
        )

        self.stdout.write("Creating simulation orders...")

        # Order 1: Sadia buys 100kg of Rice from Jamal
        with transaction.atomic():
            qty1 = 100.00
            price1 = post_rice.price_per_kg
            total1 = round(qty1 * price1, 2)
            fee1 = round(total1 * 0.10, 2)
            payout1 = total1 - fee1

            # Update customer balance and post weight
            customer_sadia.balance -= total1
            customer_sadia.save()
            post_rice.total_weight_kg -= qty1
            post_rice.save()

            order1 = Order.objects.create(
                customer=customer_sadia,
                post=post_rice,
                quantity_kg=qty1,
                status="completed",
                total_paid=total1,
                platform_fee=fee1,
                farmer_payout=payout1,
                delivery_address="Road 11, Banani, Dhaka"
            )

            # Payout Jamal
            farmer_jamal.balance += payout1
            farmer_jamal.save()

        # Order 2: Hasan buys 50kg of potatoes from Jamal (remains Pending)
        with transaction.atomic():
            qty2 = 50.00
            price2 = post_potato.price_per_kg
            total2 = round(qty2 * price2, 2)
            fee2 = round(total2 * 0.10, 2)
            payout2 = total2 - fee2

            customer_hasan.balance -= total2
            customer_hasan.save()
            post_potato.total_weight_kg -= qty2
            post_potato.save()

            Order.objects.create(
                customer=customer_hasan,
                post=post_potato,
                quantity_kg=qty2,
                status="pending",
                total_paid=total2,
                platform_fee=fee2,
                farmer_payout=payout2,
                delivery_address="Sector 4, Uttara, Dhaka"
            )

        self.stdout.write("Creating reviews...")
        # Since Sadia has a completed order from Jamal, she can review him
        Review.objects.create(
            customer=customer_sadia,
            farmer=farmer_jamal,
            rating=5,
            comment="The rice quality is top-notch! Packed nicely, and delivery was coordinated smoothly directly from Jamal. Will buy again!"
        )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
        self.stdout.write(f"  Admin: username=admin, password=adminpassword123")
        self.stdout.write(f"  Farmer: username=farmer_jamal, password=farmerpassword123")
        self.stdout.write(f"  Farmer: username=farmer_rahim, password=farmerpassword123")
        self.stdout.write(f"  Customer: username=customer_sadia, password=customerpassword123 (Balance: {customer_sadia.balance})")
        self.stdout.write(f"  Customer: username=customer_hasan, password=customerpassword123 (Balance: {customer_hasan.balance})")
