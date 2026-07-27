"""
Deliveryman system integration test.

Tests the full flow:
  1. Registration of a deliveryman user
  2. Customer places order → Farmer ships it
  3. Deliveryman sees available orders nearby
  4. Deliveryman accepts an order
  5. Deliveryman picks up the order
  6. Deliveryman delivers the order → farmer gets paid
  7. Deliveryman sees his assigned/delivery history
  8. Permission checks (non-deliveryman cannot access deliveryman endpoints)
  9. Registration with deliveryman role

Usage:
    cd backend
    python deliverytest.py

Requires: runserver running on 0.0.0.0:8000 with seeded DB.
"""

import requests
import json
import sys
import time

BASE = "http://localhost:8000/api"
OK = 0
FAIL = 0

def log(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")

def check(label, condition, detail=""):
    global OK, FAIL
    if condition:
        OK += 1
        print(f"  ✅ {label}")
    else:
        FAIL += 1
        print(f"  ❌ {label}  {detail}")

def post(path, data, token=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Token {token}"
    r = requests.post(f"{BASE}{path}", json=data, headers=h)
    return r

def get(path, params=None, token=None):
    h = {}
    if token:
        h["Authorization"] = f"Token {token}"
    r = requests.get(f"{BASE}{path}", params=params, headers=h)
    return r

def get_token(username, password):
    r = post("/auth/login/", {"email_or_phone": username, "password": password})
    if r.status_code == 200:
        return r.json()["token"]
    return None

# ── 1. Register a deliveryman ──────────────────────────────────
log("1. Registration of a deliveryman user")
r = post("/auth/register/", {
    "username": "test_delivery",
    "email": "test_delivery@example.com",
    "password": "testpass123",
    "role": "deliveryman",
    "name": "Test Delivery",
    "phone_number": "01600000999",
    "address": "Test Area, Dhaka",
})
if r.status_code == 201:
    check("Registration returns 201", True)
    d_token = r.json()["token"]
    d_user = r.json()["user"]
    check("Role is deliveryman", d_user["role"] == "deliveryman")
elif r.status_code == 400 and "already exists" in str(r.text):
    check("Registration (user already exists from prior run — ok)", True)
    d_token = get_token("test_delivery", "testpass123")
    check("Can login existing deliveryman", d_token is not None)
else:
    check("Registration fails unexpectedly", False, f"Got {r.status_code}: {r.text}")
    d_token = None

# ── 2. Login as existing deliveryman from seed ────────────────
log("2. Login as seeded deliveryman (dkarim)")
dkarim_token = get_token("dkarim", "D1")
check("dkarim login success", dkarim_token is not None)
if not dkarim_token:
    print("  ⚠ Cannot continue without deliveryman token")
    sys.exit(1)

# ── 3. Find a pending order and ship it ────────────────────────
log("3. Find a pending order and ship it")
admin_token = get_token("admin", "Adminpassword123")
check("admin login success", admin_token is not None)

r = get("/orders/", token=admin_token)
check("admin sees orders", r.status_code == 200 and len(r.json()) > 0)
if r.status_code == 200 and len(r.json()) > 0:
    pending_orders = [o for o in r.json() if o["status"] == "pending"]
    check("System has pending orders", len(pending_orders) > 0)
    if pending_orders:
        order = pending_orders[0]
        order_id = order["id"]
        farmer_username = order["post_farmer_name"]
        # Login as that farmer to ship
        # Map known names to usernames
        name_to_user = {
            "Jamal Uddin": ("fjamal", "F1"),
            "Rahim Mia": ("frahim", "F2"),
            "Karim Ahmed": ("fkarim", "F3"),
            "Selim Hossain": ("fselim", "F4"),
            "Arif Chowdhury": ("farif", "F5"),
        }
        farmer_login = name_to_user.get(farmer_username)
        if farmer_login:
            farmer_token = get_token(*farmer_login)
            check(f"Logged in as farmer {farmer_username}", farmer_token is not None)
            if farmer_token:
                r = post(f"/orders/{order_id}/ship/", {}, token=farmer_token)
                check("Ship order succeeds", r.status_code == 200,
                      f"Got {r.status_code}: {r.text}")
                if r.status_code == 200:
                    check("Status changed to shipped", r.json()["status"] == "shipped")
            shipped_order_id = order_id if farmer_token else None
        else:
            print(f"  ⚠ Unknown farmer: {farmer_username}")
            shipped_order_id = None
    else:
        shipped_order_id = None
else:
    shipped_order_id = None

# ── 4. Deliveryman sees available orders nearby ───────────────
log("4. Deliveryman views available (shipped, unassigned) orders nearby")
if shipped_order_id:
    r = get("/orders/available/", params={"lat": 23.8, "lng": 90.4, "radius": 500},
            token=dkarim_token)
    check("Available orders endpoint works", r.status_code == 200,
          f"Got {r.status_code}: {r.text}")
    if r.status_code == 200:
        available = r.json()
        check("Available orders is a list", isinstance(available, list))
        matching = [o for o in available if o["id"] == shipped_order_id]
        check("Shipped order appears in available list", len(matching) > 0)

# ── 5. Deliveryman accepts the order ──────────────────────────
log("5. Deliveryman accepts the order")
if shipped_order_id:
    r = post(f"/orders/{shipped_order_id}/accept/", {}, token=dkarim_token)
    check("Accept order succeeds", r.status_code == 200,
          f"Got {r.status_code}: {r.text}")
    if r.status_code == 200:
        check("Status changed to assigned", r.json()["status"] == "assigned")
        check("Deliveryman is set", r.json().get("deliveryman_name") is not None)

    # Double-accept should fail
    r = post(f"/orders/{shipped_order_id}/accept/", {}, token=dkarim_token)
    check("Double-accept rejected", r.status_code == 400)

# ── 6. Deliveryman picks up ───────────────────────────────────
log("6. Deliveryman picks up the order")
if shipped_order_id:
    r = post(f"/orders/{shipped_order_id}/pickup/", {}, token=dkarim_token)
    check("Pickup succeeds", r.status_code == 200,
          f"Got {r.status_code}: {r.text}")
    if r.status_code == 200:
        check("Status changed to out_for_delivery", r.json()["status"] == "out_for_delivery")
        check("picked_up_at is set", r.json().get("picked_up_at") is not None)

# ── 7. Deliveryman delivers → farmer gets paid ───────────────
log("7. Deliveryman delivers the order")
if shipped_order_id:
    # Get farmer balance before
    r = get("/auth/profile/", token=farmer_token)
    farmer_balance_before = float(r.json()["balance"]) if r.status_code == 200 else None

    r = post(f"/orders/{shipped_order_id}/deliver/", {}, token=dkarim_token)
    check("Deliver succeeds", r.status_code == 200,
          f"Got {r.status_code}: {r.text}")
    if r.status_code == 200:
        check("Status changed to completed", r.json()["status"] == "completed")
        check("delivered_at is set", r.json().get("delivered_at") is not None)

        # Verify farmer got paid
        if farmer_balance_before is not None:
            r = get("/auth/profile/", token=farmer_token)
            if r.status_code == 200:
                farmer_balance_after = float(r.json()["balance"])
                check("Farmer balance increased",
                      farmer_balance_after > farmer_balance_before,
                      f"Before: {farmer_balance_before}, After: {farmer_balance_after}")

# ── 8. Deliveryman sees his assigned orders ───────────────────
log("8. Deliveryman views his orders")
r = get("/orders/", token=dkarim_token)
check("Deliveryman sees his orders", r.status_code == 200,
      f"Got {r.status_code}: {r.text}")
if r.status_code == 200:
    my_orders = r.json()
    if shipped_order_id:
        matching = [o for o in my_orders if o["id"] == shipped_order_id]
        check("Delivered order appears in my orders", len(matching) > 0,
              f"expected id={shipped_order_id} in {[o['id'] for o in my_orders]}")

# ── 9. Permission: customer cannot accept/available ───────────
log("9. Permission checks — non-deliveryman blocked")
csadia_token = get_token("csadia", "C123")
check("csadia login success", csadia_token is not None)
if csadia_token:
    r = get("/orders/available/", token=csadia_token)
    check("Customer cannot view available orders", r.status_code in (401, 403),
          f"Got {r.status_code}")

    if shipped_order_id:
        r = post(f"/orders/{shipped_order_id}/accept/", {}, token=csadia_token)
        check("Customer cannot accept orders", r.status_code in (401, 403),
              f"Got {r.status_code}")

# ── Summary ────────────────────────────────────────────────────
log("RESULTS")
total = OK + FAIL
print(f"  Passed: {OK}/{total}")
print(f"  Failed: {FAIL}/{total}")
if FAIL == 0:
    print("\n  🎉 All deliveryman tests passed!")
else:
    print(f"\n  ❌ {FAIL} test(s) failed")
    sys.exit(1)
