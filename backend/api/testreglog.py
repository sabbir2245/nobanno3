import json
import random
import requests

# URL Configurations
BASE_URL = "http://127.0.0.1:8000/api"
REGISTER_URL = f"{BASE_URL}/auth/register/"
LOGIN_URL = f"{BASE_URL}/auth/login/"

# Helper function to generate clean test identities to avoid duplicate database collisions
def get_fresh_user_data():
    rand_id = random.randint(1000, 9999)
    return {
        "username": f"user_{rand_id}",
        "email": f"test_{rand_id}@example.com",
        "password": "SecurePassword123",
        "role": "customer",
        "name": f"Test User {rand_id}",
        "phone_number": f"0171{random.randint(1000000, 9999999)}",
        "address": "Dhaka, Bangladesh",
        "latitude": 23.8103,
        "longitude": 90.4125
    }

def run_tests():
    print("=" * 60)
    print("  NOBANNO BACKEND TEST SUITE")
    print("=" * 60)

    # -------------------------------------------------------------------------
    # TEST 1: Successful Registration
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Registering a fresh user account...")
    user_data = get_fresh_user_data()
    
    res = requests.post(REGISTER_URL, json=user_data)
    if res.status_code == 201:
        print("  PASS: Status 201 Created. Token received.")
    else:
        print(f"  FAIL: Status {res.status_code}. Response: {res.text}")
        return

    # -------------------------------------------------------------------------
    # TEST 2: Duplicate Email Registration Fails
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Duplicate email rejection...")
    dup = get_fresh_user_data()
    dup["email"] = user_data["email"]
    res = requests.post(REGISTER_URL, json=dup)
    if res.status_code == 400 and "email" in res.json():
        print("  PASS: Backend rejected duplicate email.")
    else:
        print(f"  FAIL: Expected 400 with email error, got {res.status_code}. {res.text}")

    # -------------------------------------------------------------------------
    # TEST 3: Duplicate Phone Registration Fails
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Duplicate phone rejection...")
    dup = get_fresh_user_data()
    dup["phone_number"] = user_data["phone_number"]
    res = requests.post(REGISTER_URL, json=dup)
    if res.status_code == 400 and "phone_number" in res.json():
        print("  PASS: Backend rejected duplicate phone.")
    else:
        print(f"  FAIL: Expected 400 with phone_number error, got {res.status_code}. {res.text}")

    # -------------------------------------------------------------------------
    # TEST 4-6: Login via Username / Email / Phone
    # -------------------------------------------------------------------------
    for i, (label, field) in enumerate([("Username", "username"), ("Email", "email"), ("Phone", "phone_number")]):
        print(f"\n[TEST {4+i}] Login via {label}...")
        payload = {"email_or_phone": user_data[field], "password": user_data["password"]}
        res = requests.post(LOGIN_URL, json=payload)
        if res.status_code == 200 and "token" in res.json():
            print(f"  PASS: Authenticated via {label}.")
        else:
            print(f"  FAIL: Status {res.status_code}. {res.text}")

    # -------------------------------------------------------------------------
    # TEST 7: Invalid Credentials
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Invalid credentials rejection...")
    payload = {"email_or_phone": user_data["email"], "password": "WrongPasswordHere"}
    res = requests.post(LOGIN_URL, json=payload)
    if res.status_code == 400:
        print("  PASS: Backend rejected bad password.")
    else:
        print(f"  FAIL: Expected 400, got {res.status_code}. {res.text}")

    print("\n" + "=" * 60)
    print("  AUTH FLOW CHECKS COMPLETE")
    print("=" * 60)

    # =========================================================================
    # RATING & REVIEW TESTS (using seed data)
    # =========================================================================

    def login(username, password):
        r = requests.post(LOGIN_URL, json={"email_or_phone": username, "password": password})
        if r.status_code != 200:
            print(f"\n  WARN: Could not login as {username} (seed data missing). Skipping review tests.")
            return None
        return r.json()["token"], r.json()["user"]

    fjamal = login("fjamal", "f1")
    csadia = login("csadia", "c123")
    frahim = login("frahim", "f2")
    chasan = login("chasan", "c23")
    admin = login("admin", "adminpassword123")

    if not all([fjamal, csadia, frahim, chasan, admin]):
        print("\n  SKIPPING: Seed data not available for review tests.")
        return

    fjamal_token, fjamal_user = fjamal
    csadia_token, csadia_user = csadia
    frahim_token, frahim_user = frahim
    chasan_token, chasan_user = chasan
    admin_token, admin_user = admin

    REVIEW_URL = f"{BASE_URL}/reviews/"
    USERS_URL = f"{BASE_URL}/users/"
    POSTS_URL = f"{BASE_URL}/posts/"
    ORDERS_URL = f"{BASE_URL}/orders/"

    # Fetch fjamal's posts to get specific post IDs
    res = requests.get(POSTS_URL, params={"farmer_id": fjamal_user["id"]})
    if res.status_code != 200 or len(res.json()) == 0:
        print("\n  FAIL: Could not fetch fjamal's posts.")
        return
    fjamal_posts = res.json()
    print(f"\n  Found {len(fjamal_posts)} posts for fjamal.")
    for p in fjamal_posts:
        print(f"    Post #{p['id']}: {p['title']}")

    # Fetch frahim's posts
    res = requests.get(POSTS_URL, params={"farmer_id": frahim_user["id"]})
    if res.status_code != 200 or len(res.json()) == 0:
        print("\n  FAIL: Could not fetch frahim's posts.")
        return
    frahim_posts = res.json()
    print(f"  Found {len(frahim_posts)} posts for frahim.")
    for p in frahim_posts:
        print(f"    Post #{p['id']}: {p['title']}")

    # Identify specific posts by title
    banana_avg = next(p for p in fjamal_posts if "Sagar Banana" in p["title"])
    cucumber = next(p for p in frahim_posts if "Cucumber" in p["title"])
    print(f"\n  Using: banana_avg=#{banana_avg['id']}, cucumber=#{cucumber['id']}")

    # -------------------------------------------------------------------------
    # TEST 8: Check farmer's avg_rating from seed data
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Seed farmer fjamal avg_rating check...")
    res = requests.get(f"{USERS_URL}{fjamal_user['id']}/", headers={"Authorization": f"Token {admin_token}"})
    if res.status_code == 200:
        data = res.json()
        print(f"  Farmer: {data['username']}, avg_rating={data['avg_rating']}, ratings_count={data['ratings_count']}")
        # 4 reviews with ratings 5,4,5,4 → avg 4.5
        if data["avg_rating"] == 4.5 and data["ratings_count"] == 4:
            print("  PASS: fjamal has 4.5 avg from 4 seed reviews.")
        else:
            print(f"  NOTE: Expected 4.5/4, got {data['avg_rating']}/{data['ratings_count']}")
    else:
        print(f"  FAIL: Status {res.status_code}")

    # -------------------------------------------------------------------------
    # TEST 9: Duplicate review for same post -> 400 (unique_together)
    # -------------------------------------------------------------------------
    print("\n[TEST 9] csadia tries to re-review banana_avg (duplicate per-post)...")
    res = requests.post(REVIEW_URL, json={
        "post": banana_avg["id"],
        "rating": 4,
        "comment": "Trying to review same post again"
    }, headers={"Authorization": f"Token {csadia_token}"})
    if res.status_code == 400:
        print("  PASS: Backend rejected duplicate review for same post.")
    else:
        print(f"  NOTE: Expected 400, got {res.status_code}. {res.text}")

    # -------------------------------------------------------------------------
    # TEST 10: Review without completed order -> 400
    # -------------------------------------------------------------------------
    print("\n[TEST 10] chasan trying to review banana_avg (no completed order)...")
    res = requests.post(REVIEW_URL, json={
        "post": banana_avg["id"],
        "rating": 5,
        "comment": "Great product!"
    }, headers={"Authorization": f"Token {chasan_token}"})
    if res.status_code == 400:
        print("  PASS: Backend rejected review without completed order.")
    else:
        print(f"  FAIL: Expected 400, got {res.status_code}. {res.text}")

    # =========================================================================
    # Ship + Complete chasan's pending order with frahim
    # =========================================================================
    print("\n[TEST 11] Ship chasan's pending order (as frahim)...")
    res = requests.get(ORDERS_URL, headers={"Authorization": f"Token {frahim_token}"})
    if res.status_code != 200:
        print(f"  FAIL: Could not fetch frahim's orders. {res.text}")
        return
    orders = res.json()
    pending = [o for o in orders if o["status"] == "pending"]
    if not pending:
        print("  SKIP: No pending orders found for frahim.")
    else:
        order_id = pending[0]["id"]
        print(f"  Found pending order #{order_id}")
        res = requests.post(f"{ORDERS_URL}{order_id}/ship/", headers={"Authorization": f"Token {frahim_token}"})
        if res.status_code == 200 and res.json()["status"] == "shipped":
            print("  PASS: Order shipped by frahim.")
        else:
            print(f"  FAIL: Could not ship order. {res.status_code}. {res.text}")

        print("\n[TEST 12] Complete order (as chasan)...")
        res = requests.post(f"{ORDERS_URL}{order_id}/complete/", headers={"Authorization": f"Token {chasan_token}"})
        if res.status_code == 200 and res.json()["status"] == "completed":
            print("  PASS: Order completed by chasan.")
        else:
            print(f"  FAIL: Could not complete order. {res.status_code}. {res.text}")

        # -------------------------------------------------------------------------
        # TEST 13: chasan reviews the cucumber post
        # -------------------------------------------------------------------------
        print("\n[TEST 13] chasan reviews cucumber post with rating + comment...")
        res = requests.post(REVIEW_URL, json={
            "post": cucumber["id"],
            "rating": 4,
            "comment": "Good quality cucumbers, fast delivery!"
        }, headers={"Authorization": f"Token {chasan_token}"})
        if res.status_code == 201:
            review = res.json()
            print(f"  PASS: Review created. Rating={review['rating']}, comment='{review['comment']}'")
            print(f"  Customer: {review['customer_username']}, Post: {review['post_title']}")
        else:
            print(f"  FAIL: Expected 201, got {res.status_code}. {res.text}")

        # -------------------------------------------------------------------------
        # TEST 14: Verify frahim's avg_rating updated
        # -------------------------------------------------------------------------
        print("\n[TEST 14] Verify frahim's avg_rating updated...")
        res = requests.get(f"{USERS_URL}{frahim_user['id']}/", headers={"Authorization": f"Token {admin_token}"})
        if res.status_code == 200:
            data = res.json()
            print(f"  frahim: avg_rating={data['avg_rating']}, ratings_count={data['ratings_count']}")
            # csadia gave 5 on cherries + chasan gave 4 on cucumber = (5+4)/2 = 4.5
            if data["ratings_count"] == 2 and data["avg_rating"] == 4.5:
                print("  PASS: Stats match (2 reviews, 4.5 avg).")
            else:
                print(f"  NOTE: Expected 2 reviews at 4.5, got {data['ratings_count']} at {data['avg_rating']}")
        else:
            print(f"  FAIL: Status {res.status_code}")

        # -------------------------------------------------------------------------
        # TEST 15: chasan tries to review cucumber post again -> 400
        # -------------------------------------------------------------------------
        print("\n[TEST 15] chasan tries to review cucumber post again (duplicate)...")
        res = requests.post(REVIEW_URL, json={
            "post": cucumber["id"],
            "rating": 3,
            "comment": "Second review attempt"
        }, headers={"Authorization": f"Token {chasan_token}"})
        if res.status_code == 400:
            print("  PASS: Backend rejected duplicate review for same post.")
        else:
            print(f"  NOTE: Expected 400, got {res.status_code}. {res.text}")

        # -------------------------------------------------------------------------
        # TEST 16: List reviews for frahim
        # -------------------------------------------------------------------------
        print("\n[TEST 16] List reviews for frahim...")
        res = requests.get(f"{REVIEW_URL}?farmer_id={frahim_user['id']}")
        if res.status_code == 200:
            reviews = res.json()
            print(f"  Found {len(reviews)} review(s) for frahim.")
            for r in reviews:
                print(f"    - {r['customer_username']} on '{r['post_title']}': {r['rating']} stars '{r['comment']}'")
            if len(reviews) >= 2:
                print("  PASS: Reviews listed successfully.")
            else:
                print("  FAIL: Expected at least 2 reviews.")
        else:
            print(f"  FAIL: Status {res.status_code}")

        # -------------------------------------------------------------------------
        # TEST 17: csadia can review a *different* fjamal post (p_carrot2, not yet reviewed)
        # -------------------------------------------------------------------------
        print("\n[TEST 17] csadia reviews unreviewed carrot2 post...")
        carrot2 = next((p for p in fjamal_posts if "Juicing Carrots" in p["title"]), None)
        if carrot2:
            res = requests.post(REVIEW_URL, json={
                "post": carrot2["id"],
                "rating": 4,
                "comment": "Good bulk carrots for juicing."
            }, headers={"Authorization": f"Token {csadia_token}"})
            if res.status_code == 201:
                print("  PASS: csadia can review a different post from same farmer.")
            else:
                print(f"  NOTE: Expected 201, got {res.status_code}. {res.text}")

            # Verify fjamal stats now show 5 reviews
            print("\n[TEST 17b] fjamal avg_rating after 5th review...")
            res = requests.get(f"{USERS_URL}{fjamal_user['id']}/", headers={"Authorization": f"Token {admin_token}"})
            if res.status_code == 200:
                data = res.json()
                print(f"  fjamal: avg_rating={data['avg_rating']}, ratings_count={data['ratings_count']}")
                if data["ratings_count"] == 5:
                    print("  PASS: fjamal now has 5 reviews.")
                else:
                    print(f"  NOTE: Expected 5, got {data['ratings_count']}")
        else:
            print("  SKIP: carrot2 post not found.")

    print("\n" + "=" * 60)
    print("  ALL TESTS COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    try:
        run_tests()
    except requests.exceptions.ConnectionError:
        print(f"\n  CONNECTION ERROR: Could not reach Django at {BASE_URL}.")
        print("  Make sure 'python manage.py runserver 0.0.0.0:8000' is running.")
