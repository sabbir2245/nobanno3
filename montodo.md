# Payment Gateway Migration & Delivery System — Implementation Spec

> Audience: AI coding agent / engineering team implementing this in the codebase.
> Status: Specification for implementation. Not yet built. Treat every "Action" item as a task.

---

## 1. Payment Gateway: Migrate off SSLCommerz to bKash

**Decision:** SSLCommerz is discontinued. Do **not** delete the SSLCommerz code —  (or gate it behind a disabled feature flag) so it can be referenced or restored later if needed. Do not route any traffic through it. just dont show the pay via SSLCommerz option to customers in the UI. fornednt . 

### 1.1 Actions

  ```
- [ ] Remove/hide SSLCommerz as a selectable payment option in any customer-facing UI.
- [ ] Confirm no cron jobs, scheduled reconciliation tasks, or webhooks still point at SSLCommerz endpoints.
- [ ] Leave SSLCommerz env vars/config in place but unused (or clearly marked deprecated), so no other systems break.

### 1.2 New Payment Flow Overview

There are two distinct legs of money movement. They are **not** the same transaction and should be modeled as two separate systems/records:

```
Leg 1: Customer → Admin (platform)     via bKash API      [automated, real-time]
Leg 2: Admin → Farmer/Merchant bank    via bank BEFTN      [manual/batch, invoice-driven]
```

### 1.3 Leg 1 — Customer to Admin (bKash)
- Integrate the **bKash Payment Gateway API** (Checkout/Tokenized API) for consumer-facing checkout.
- Customer pays the order amount; funds are credited to the Admin's (platform's) bKash merchant account.
- Standard integration requirements:
  - Create payment (init) → redirect/collect → execute payment → callback/webhook to confirm.
  - Persist bKash `trxID`, payment status, amount, and order reference on the order record.
  - Handle failure/cancel/timeout states and allow retry.
  - Reconcile payment status via bKash's query API before marking an order as "paid."
- This replaces SSLCommerz as the **only** customer payment method going forward.

### 1.4 Leg 2 — Admin to Farmer/Merchant (Bank Settlement via BEFTN)

The platform (Admin) collects money via bKash, then periodically pays out to farmers'/merchants' bank accounts in bulk via the bank's **BEFTN** (Bangladesh Electronic Funds Transfer Network) batch process. This is **not automated through an API in phase 1** — it is invoice/file driven:

1. Admin selects a date range (or a specific day) of completed/paid orders.
2. System generates a **BEFTN-format invoice/CSV** listing every order in that period along with each farmer's payout details (see §1.5 for the file spec).
3. Admin reviews, signs, and emails this invoice/CSV to the bank.
4. The bank executes the batch payment to each farmer's bank account per the file.
5. (Future/optional) Admin can mark the batch as "settled" in the system once the bank confirms.

**For this phase, only build the CSV/invoice generation — no direct bank API integration.**

### 1.5 BEFTN Invoice CSV — Field Spec

A sample template has been generated: `bftn_invoice_sample.csv`.

Required columns (standard fields banks expect for a BEFTN batch instruction, plus order traceability):

| Column | Description |
|---|---|
| SL | Serial number |
| Order_ID | Platform order ID (for traceability, not sent to bank but useful for reconciliation) |
| Farmer_Name | Beneficiary (farmer) full name, as per bank account |
| Bank_Name | Farmer's bank name |
| Branch_Name | Bank branch name |
| Routing_Number | Bank branch routing number (required for BEFTN) |
| Account_Number | Farmer's bank account number |
| Account_Type | Savings / Current |
| Mobile_Number | Farmer's contact number |
| Amount_BDT | Net payable amount to this farmer for this order/period |
| Order_Date | Date of the order being settled |
| Remarks | Optional note (e.g. order reference, product summary) |

### 1.6 Action Items — Invoice Generation Service
- [ ] Build a report/service that, given a date (or date range), pulls all paid orders in that window.
- [ ] Join each order to the farmer's saved bank account details (bank name, branch, routing number, account number, account type) and mobile number.
- [ ] Aggregate/net amounts per farmer if a farmer has multiple orders in the period (confirm with stakeholders whether the bank wants one row per order or one row per farmer per period — default to one row per order for full traceability, with a summary total row).
- [ ] Export as CSV in the format above, downloadable/emailable by Admin.
- [ ] Ensure farmer bank details exist and are validated (routing number format, account number present) before including them — flag incomplete records instead of silently skipping them.
- [ ] Do not auto-send to the bank. Output is for Admin to review, sign, and send manually.

---

## 2. Delivery System

### 2.1 Role: Deliveryman
- Add **"Deliveryman"** as a selectable role at signup, alongside existing roles (e.g. Customer, Farmer/Merchant, Admin).
- On login, a Deliveryman lands on a **Deliveryman Dashboard** (distinct from Customer/Admin dashboards).

### 2.2 Deliveryman Dashboard — Nearby Orders
- Dashboard shows orders/packages available near the deliveryman, i.e. within areas they've indicated they can service ("possible areas they can pick up").
- Deliveryman should be able to see and select which service area(s) they're available for.

### 2.3 Location Selection — Cascading Dropdowns
- Location is entered/selected using Bangladesh's administrative hierarchy, as cascading dropdowns:
  1. **District (জেলা)**
  2. **Upazila (উপজেলা)**
  3. **Union (ইউনিয়ন)**
  4. **Ward (ওয়ার্ড)**
- Each dropdown filters based on the parent selection above it (categorized/hierarchical data — Ward options depend on the selected Union, etc.).
- On load, attempt to **auto-fill** these fields based on the user's device/browser location (geolocation), but the user must be able to **manually override/change** any of these fields.

### 2.4 Collection Point Address
- A separate free-text field: **"Collection Point Address"**.
- Purpose: a specific, landmark-based description (not a formal postal address) that helps the delivery driver physically locate the pickup point on the ground — e.g. "Blue mosque, opposite Rahim's tea stall."
- This field is **optional** ("nominal") — not a required field.

### 2.5 Package View (Consolidated Orders)
When multiple individual orders are grouped together into a single pickup/delivery **package**, the deliveryman needs a consolidated view showing:
- **Total amount** for the whole package.
- **Number of farmers** whose products are included.
- **List of products** per farmer.
- **Location(s)** for pickup (using the location hierarchy + collection point address above).
- **Farmer contact info** (phone number) for each farmer included — so the deliveryman can call ahead before arriving to pick up.

### 2.6 Action Items — Delivery System
- [ ] Add `deliveryman` as a role option in signup flow and auth/role model.
- [ ] Build Deliveryman Dashboard: list of nearby available orders/packages, filterable/selectable by service area.
- [ ] Build cascading District → Upazila → Union → Ward dropdown component, backed by a structured administrative-area dataset.
- [ ] Implement geolocation-based auto-fill for the above, with manual override.
- [ ] Add optional free-text "Collection Point Address" field to relevant order/pickup forms.
- [ ] Build order-package aggregation logic: group orders into a package (basis for grouping — e.g. same pickup area/time window — to be confirmed) and compute total amount, farmer count, product list.
- [ ] Build package detail view for deliveryman showing all fields in §2.5, including tap-to-call farmer contact numbers.

---

## 3. Open Questions (confirm with stakeholders before/while building)
- BEFTN CSV: one row per order, or netted per farmer per settlement period?
- Package grouping logic: what determines which orders get bundled into one package (geography, time window, both)?
- Does the deliveryman select their service area once (profile-level) or per session/day?
- Any SLA/expiry on how long an order stays visible/available for pickup before reassignment?
- Settlement confirmation loop: once the bank pays per the CSV, how/where does Admin mark those orders as "settled to farmer"?


beftn invoice sample.csv
SL,Order_ID,Farmer_Name,Bank_Name,Branch_Name,Routing_Number,Account_Number,Account_Type,Mobile_Number,Amount_BDT,Order_Date,Remarks
1,ORD-100234,Md. Abdul Karim,Sonali Bank,Savar Branch,200261234,1234567890123,Savings,01711000001,4500.00,2026-07-25,5kg potato + 10kg rice
2,ORD-100235,Rahima Begum,Agrani Bank,Manikganj Branch,150271234,9876543210987,Savings,01711000002,2300.50,2026-07-25,Vegetables mixed lot
3,ORD-100236,Md. Selim Mia,Islami Bank Bangladesh,Dhamrai Branch,125051234,4567891230456,Current,01711000003,6100.00,2026-07-25,Wheat 20kg
4,ORD-100237,Nasrin Akter,Rupali Bank,Nawabganj Branch,175321234,7891234560789,Savings,01711000004,1800.00,2026-07-25,Fruits assorted
,,,,,,,,TOTAL,14700.50,,