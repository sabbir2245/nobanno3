import requests
import json
import time

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
SEEDED_ADMIN = {"username": "dynamic_admin", "password": "AdminSecurePassword123"}


def print_debug_response(response):
    """Helper to print readable network information when an error occurs."""
    print(f"   --> Status Code: {response.status_code}")
    print(f"   --> Headers Sent: {response.request.headers}")
    try:
        print(f"   --> Response Body: {json.dumps(response.json(), indent=2)}")
    except ValueError:
        print(f"   --> Response Body (Raw Text): {response.text[:500]}")


def require_success(response, label):
    if response.status_code in (200, 201):
        return response.json()
    print(f"   ❌ ERROR: {label}")
    print_debug_response(response)
    return None


def run_workflow():
    print("🚀 Starting Automated Workflow Test against PostgreSQL...\n")

    unique_suffix = int(time.time())
    created_posts = []

    # ==========================================
    # 1. REGISTER FARMER
    # ==========================================
    farmer_data = {
        "username": f"farmer_{unique_suffix}",
        "email": f"farmer_{unique_suffix}@test.com",
        "password": "SecurePassword123",
        "role": "farmer",
        "name": "Test Farmer",
        "address": "Mymensingh Sadar, Mymensingh",
        "latitude": 23.8200,
        "longitude": 90.4100,
    }
    print(f"1. Registering Farmer ({farmer_data['username']})")
    reg_farmer_resp = requests.post(f"{BASE_URL}/auth/register/", json=farmer_data)
    farmer_payload = require_success(reg_farmer_resp, "Farmer registration failed")
    if not farmer_payload:
        return

    farmer_token = farmer_payload["token"]
    farmer_id = farmer_payload["user"]["id"]
    farmer_headers = {"Authorization": f"Token {farmer_token}"}
    print(f"   ✅ Farmer registered (id={farmer_id}). Token: {farmer_token[:10]}...")

    # ==========================================
    # 2. REGISTER CUSTOMER
    # ==========================================
    customer_data = {
        "username": f"buyer_{unique_suffix}",
        "email": f"buyer_{unique_suffix}@test.com",
        "password": "SecurePassword123",
        "role": "customer",
        "name": "Test Buyer",
        "address": "Banani, Dhaka",
        "latitude": 23.8103,
        "longitude": 90.4125,
    }
    print(f"\n2. Registering Customer ({customer_data['username']})")
    reg_cust_resp = requests.post(f"{BASE_URL}/auth/register/", json=customer_data)
    customer_payload = require_success(reg_cust_resp, "Customer registration failed")
    if not customer_payload:
        return

    customer_token = customer_payload["token"]
    customer_id = customer_payload["user"]["id"]
    customer_headers = {"Authorization": f"Token {customer_token}"}
    print(f"   ✅ Customer registered (id={customer_id}). Token: {customer_token[:10]}...")

    # ==========================================
    # 3. ADMIN TOP-UP CUSTOMER BALANCE
    # ==========================================
    print("\n3. Logging in as superuser to top up customer wallet balance...")
    admin_login_resp = requests.post(f"{BASE_URL}/auth/login/", json=SEEDED_ADMIN)
    admin_payload = require_success(admin_login_resp, "Admin login failed. Did you run createsuperuser?")
    if not admin_payload:
        return

    admin_headers = {"Authorization": f"Token {admin_payload['token']}"}
    topup_amount = "15000.00"
    topup_resp = requests.post(
        f"{BASE_URL}/users/{customer_id}/topup/",
        json={"amount": topup_amount},
        headers=admin_headers,
    )
    topup_data = require_success(topup_resp, "Customer balance top-up failed")
    if not topup_data:
        return
    print(f"   ✅ Customer balance topped up by {topup_amount} BDT successfully.")
    
    # ==========================================
    # 4. CREATE CROP POSTS
    # ==========================================
    posts_to_create = [
        {
            "title": "Premium Basmati Rice Batch A",
            "description": "Top quality organic basmati rice harvested near anchor.",
            "latitude": 23.8200,
            "longitude": 90.4100,
            "total_weight_kg": "500.00",
            "price_per_kg": "85.00",
        },
        {
            "title": "Premium Basmati Rice Batch B",
            "description": "Top quality organic basmati rice from northern fields far away.",
            "latitude": 24.8000,
            "longitude": 90.4100,
            "total_weight_kg": "1200.00",
            "price_per_kg": "80.00",
        },
        {
            "title": "Fresh Bogra Alu (Potato)",
            "description": "High quality local Alu directly from the fields.",
            "latitude": 23.8150,
            "longitude": 90.4110,
            "total_weight_kg": "2000.00",
            "price_per_kg": "35.00",
        },
        {
            "title": "Green Chillies (Kacha Morich)",
            "description": "Fresh spicy green chillies picked this morning.",
            "latitude": 23.8180,
            "longitude": 90.4095,
            "total_weight_kg": "300.00",
            "price_per_kg": "120.00",
        },
        {
            "title": "Local Tomatoes (Desi Tomato)",
            "description": "Juicy red tomatoes, ideal for restaurants and grocers.",
            "latitude": 23.8220,
            "longitude": 90.4080,
            "total_weight_kg": "800.00",
            "price_per_kg": "45.00",
        },
        {
            "title": "Organic Moshur Dal (Red Lentils)",
            "description": "Chemical-free red lentils, cleaned and sun-dried.",
            "latitude": 23.8175,
            "longitude": 90.4130,
            "total_weight_kg": "600.00",
            "price_per_kg": "95.00",
        },
        {
            "title": "Seasonal Langra Mangoes",
            "description": "Sweet Langra mangoes from Rajshahi orchards.",
            "latitude": 24.1000,
            "longitude": 89.5000,
            "total_weight_kg": "400.00",
            "price_per_kg": "150.00",
        },
    ]

    print(f"\n4. Creating {len(posts_to_create)} crop posts")
    for idx, post_data in enumerate(posts_to_create, start=1):
        resp = requests.post(f"{BASE_URL}/posts/", json=post_data, headers=farmer_headers)
        created = require_success(resp, f"Failed to create post #{idx} ({post_data['title']})")
        if not created:
            return
        created_posts.append(created)
        print(f"   ✅ [{idx}] {created['title']} (id={created['id']})")

    # ==========================================
    # 5. KEYWORD SEARCH WITH DISTANCE SORTING
    # ==========================================
    # Providing both standardized naming metrics just in case
    search_params = {"q": "alu", "lat": 23.8103, "lng": 90.4125, "latitude": 23.8103, "longitude": 90.4125}
    print(f"\n5. Searching posts by keyword: {search_params['q']}")
    search_resp = requests.get(
        f"{BASE_URL}/posts/search_by_keyword/",
        params=search_params,
        headers=customer_headers,
    )
    search_results = require_success(search_resp, "Keyword search failed")
    if search_results is None:
        return

    print(f"   ✅ Found {len(search_results)} item(s) matching 'alu'")
    print("\n📋 Distance-sorted search results (nearest first):")
    for idx, item in enumerate(search_results, start=1):
        print(f"   [{idx}] {item['title']}")
        print(f"       Distance: {item.get('distance_km')} km")
        print(f"       Coordinates: ({item.get('latitude')}, {item.get('longitude')})")

    if len(search_results) >= 2:
        dist_a = search_results[0].get("distance_km", 0)
        dist_b = search_results[1].get("distance_km", 0)
        if dist_a and dist_b and dist_a <= dist_b:
            print("   ✅ Spatial sorting verified (nearest first).")

    # Pick the Alu post for the purchase flow
    alu_post = next((p for p in created_posts if "Alu" in p["title"]), created_posts[0])
    purchase_qty_kg = 50.00
    expected_total = round(purchase_qty_kg * float(alu_post["price_per_kg"]), 2)

    # ==========================================
    # 6. CUSTOMER PLACES ORDER (BUYING PROCESS)
    # ==========================================
    order_data = {
        "post": alu_post["id"],
        "quantity_kg": str(purchase_qty_kg),
        "delivery_address": "Road 11, Banani, Dhaka",
    }
    print(f"\n6. Customer placing order for {purchase_qty_kg}kg of '{alu_post['title']}'")
    order_resp = requests.post(f"{BASE_URL}/orders/", json=order_data, headers=customer_headers)
    order = require_success(order_resp, "Order placement failed")
    if not order:
        return

    order_id = order["id"]
    print(f"   ✅ Order #{order_id} created (status={order['status']})")
    print(f"       Total paid: {order['total_paid']} BDT (expected ~{expected_total})")
    print(f"       Platform fee (10%): {order['platform_fee']} BDT")
    print(f"       Farmer payout (90%): {order['farmer_payout']} BDT")

    # ==========================================
    # 7. FARMER SHIPS ORDER (MOCK SHIPPING)
    # ==========================================
    print(f"\n7. Farmer marking order #{order_id} as shipped")
    ship_resp = requests.post(f"{BASE_URL}/orders/{order_id}/ship/", headers=farmer_headers)
    shipped_order = require_success(ship_resp, "Order shipping failed")
    if not shipped_order:
        return
    print(f"   ✅ Order status updated: {shipped_order['status']}")

    # ==========================================
    # 8. CUSTOMER COMPLETES ORDER (DELIVERY CONFIRMED)
    # ==========================================
    print(f"\n8. Customer confirming delivery for order #{order_id}")
    complete_resp = requests.post(
        f"{BASE_URL}/orders/{order_id}/complete/",
        headers=customer_headers,
    )
    completed_order = require_success(complete_resp, "Order completion failed")
    if not completed_order:
        return
    print(f"   ✅ Order completed. Status: {completed_order['status']}")

    # ==========================================
    # 9. FARMER WALLET CHECK
    # ==========================================
    print("\n9. Checking farmer wallet after payout")
    wallet_resp = requests.get(f"{BASE_URL}/farmer/wallet/", headers=farmer_headers)
    wallet = require_success(wallet_resp, "Farmer wallet fetch failed")
    if not wallet:
        return
    print(f"   ✅ Farmer balance: {wallet['balance']} BDT")
    print(f"       Total earnings (completed): {wallet['total_earnings']} BDT")
    print(f"       Pending payouts: {wallet['pending_payouts']} BDT")

    # ==========================================
    # 10. CUSTOMER REVIEWS FARMER
    # ==========================================
    review_data = {
        "farmer": farmer_id,
        "rating": 5,
        "comment": "Excellent quality Alu! Fast coordination and smooth delivery. Highly recommended.",
    }
    print(f"\n10. Customer submitting review for farmer (id={farmer_id})")
    review_resp = requests.post(f"{BASE_URL}/reviews/", json=review_data, headers=customer_headers)
    review = require_success(review_resp, "Review submission failed")
    if not review:
        return
    print(f"   ✅ Review posted: {review['rating']} stars — \"{review['comment'][:60]}...\"")

    # ==========================================
    # 11. LIST REVIEWS FOR FARMER
    # ==========================================
    print(f"\n11. Fetching all reviews for farmer id={farmer_id}")
    reviews_resp = requests.get(
        f"{BASE_URL}/reviews/",
        params={"farmer_id": farmer_id},
    )
    reviews = require_success(reviews_resp, "Review listing failed")
    if reviews is None:
        return

    print(f"   ✅ Found {len(reviews)} review(s) for this farmer:")
    for idx, r in enumerate(reviews, start=1):
        print(f"       [{idx}] {r['rating']}★ by {r.get('customer_username', 'customer')}: {r.get('comment', '')[:50]}")

    # Verify farmer avg_rating via profile
    profile_resp = requests.get(f"{BASE_URL}/auth/profile/", headers=farmer_headers)
    profile = require_success(profile_resp, "Farmer profile fetch failed")
    if profile:
        print(f"   ✅ Farmer avg_rating on profile: {profile.get('avg_rating')}")

    print("\n🎉 FULL WORKFLOW PASSED: posts → search → buy → ship → complete → review")


if __name__ == "__main__":
    run_workflow()