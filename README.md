# Nobanno (নবান্ন)

**Empowering Farmers. Eliminating Middlemen. Feeding Communities.**

Nobanno is a centralized agricultural marketplace that connects farmers directly with bulk-buying consumers. Operating on a transparent 10% commission model, the platform ensures farmers get a fair price for their harvest while giving consumers access to fresh, locally-sourced goods.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Platform Workflow](#platform-workflow)
3. [User Roles & Features](#user-roles--features)
4. [Tech Stack](#tech-stack)
5. [System Architecture](#system-architecture)
6. [Getting Started (Development)](#getting-started-development)

---

## Project Overview
The traditional agricultural supply chain is heavily layered with middlemen, reducing the profit margin for actual growers. Nobanno solves this by offering a "social media-style" marketplace. Farmers create visual posts of their yields (including weight and price), and local buyers can discover these posts using geolocation, purchasing them directly in bulk.

**Business Model:** Nobanno takes a flat **10% commission** on successful sales to maintain platform infrastructure. (e.g., Customer pays ৳100 → Admin retains ৳10 → Farmer receives ৳90).

---

## Platform Workflow
1. **Discovery:** Farmer harvests a crop and creates a "Post" (Image, Name, Total Weight kg, Price per kg).
2. **Matching:** Customer opens the app, allows location access, and searches for products. The algorithm filters and displays posts geographically closest to the customer.
3. **Quantity Selection:** Customer selects a post, chooses the desired quantity (partial purchase allowed — any amount up to the available total weight).
4. **Checkout (Single/Multiple):** Customer adds items to cart. A single "Place Order" button processes all cart items at once via the bulk orders endpoint. Delivery address is collected via modal.
5. **Processing:** The order hits the database. The system logs the 10% platform fee and assigns the remaining 90% payout (of the product cost) as pending for the farmer.
6. **Fulfillment:** The Farmer receives the Customer's delivery address and ships the goods directly.
7. **Delivery Confirmation:** The Customer confirms delivery in-app once goods are received. This triggers the release of the 90% payout to the Farmer's wallet.
8. **Reviews:** Customer can review and rate the Farmer (out of 5 stars, with optional photos) only after confirming delivery for that specific order.

---

## User Roles & Features

### 1. Admin (Superuser)
The central authority managing platform health, dispute resolution, and finances.
* **Analytics Dashboard:** View total gross merchandise value (GMV), net 10% profit, active users, and geographical hotspots.
* **User Management:** Suspend, ban, verify, or top up accounts.
* **Order Ledger:** Global view of all pending, shipped, and completed orders.
* **Payout Management:** Monitor farmer payouts released upon delivery confirmation.

### 2. Farmer (Seller)
The supplier side of the marketplace.
* **Social-Style Listings:** Create visually appealing product posts with ease.
* **Inventory Management:** Update available weight dynamically as orders come in. A post is auto-closed when remaining weight reaches 0.
* **Order Hub:** View customer orders and update shipping statuses.
* **Wallet:** View total earnings, pending payouts (awaiting delivery confirmation), and platform commission deductions.

### 3. Customer (Bulk Buyer)
Restaurants, wholesalers, or large families looking for direct farm goods.
* **Geo-Search:** View a localised feed of available goods within a configurable radius.
* **Search & Filter:** Find specific crops, filter by type, and sort by nearest, price, stock, or rating.
* **Partial Buying:** Purchase any quantity up to the full available weight of a listing.
* **Cart & Bulk Checkout:** Add multiple items to cart, place a single order for all items via a delivery address modal.
* **Order Tracking:** Dedicated Orders tab with sort by date or status. Actions: Confirm Delivery (shipped), Write a Review (completed).
* **Delivery Confirmation & Reviews:** Confirm receipt to release farmer payment and leave a rating with optional photos.

### 4. Deliveryman
Handles physical order fulfillment.
* Claim available shipped orders within a geo-radius.
* Update order status: assigned → picked up → delivered.
* Farmer payout is released upon delivery confirmation.

---

## System Architecture

### Auth
Token-based auth (DRF Token Authentication). Login via `username`, `email`, or `phone_number` using custom `EmailOrPhoneBackend`.

### Users Table
Single Django `User` model with role field (`admin`, `farmer`, `customer`, `deliveryman`). Balance is managed server-side and not writable via API.

### Posts / Products Table
Linked to Farmer ID. Contains `total_weight_kg` as the stock field (no separate `available_weight_kg`). Decremented atomically on each order.

### Orders Table
Links Customer to Post. Contains `platform_fee` (10%) and `farmer_payout` (90%). Status flow: `pending → shipped → completed/cancelled`. Customer can confirm delivery (`complete` action) which triggers farmer payment.

### Reviews Table
One review per customer per post (unique_together constraint). Only creatable after a completed order for that post.

### Key Endpoints
- `POST /api/orders/bulk_create/` — Atomically creates multiple orders with validation (stock, balance), deducts stock and balance, returns all created orders. Used by the cart's "Place Order" button.

---

## Tech Stack
- **Backend:** Django 5.2 + DRF 3.17 + PostgreSQL (SQLite for tests)
- **Frontend:** React Native (Expo SDK 52, RN 0.76) with expo-router
- **Authentication:** DRF Token auth
- **Database:** PostgreSQL (production), SQLite (development/testing)

---

## Getting Started (Development)

### Backend Setup
```bash
cd backend
source ../venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data        # clears DB, seeds 1 admin + 5 farmers + 2 customers
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
cd frontend
npm install
npx expo start -c
```

### Running Tests
```bash
cd backend
source ../venv/bin/activate
python manage.py test api
```

### Seed Credentials
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `mik` |
| Farmer | `farmer_jamal` | `farmerpassword123` |
| Customer | `customer_sadia` | `customerpassword123` |

Full list in `backend/TESTING.md`.

---

*Built to bring the harvest home.*
