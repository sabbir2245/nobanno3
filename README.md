# 🌾 Nobanno (নবান্ন)

**Empowering Farmers. Eliminating Middlemen. Feeding Communities.**

Nobanno is a centralized agricultural marketplace that connects farmers directly with bulk-buying consumers. Operating on a transparent 10% commission model, the platform ensures farmers get a fair price for their harvest while giving consumers access to fresh, locally-sourced goods.



## 📖 Table of Contents
1. [Project Overview](#project-overview)
2. [Platform Workflow](#platform-workflow)
3. [User Roles & Features](#user-roles--features)
4. [Tech Stack](#tech-stack)
5. [System Architecture](#system-architecture)
6. [Getting Started (Development)](#getting-started-development)

---

## 🎯 Project Overview
The traditional agricultural supply chain is heavily layered with middlemen, reducing the profit margin for actual growers. Nobanno solves this by offering a "social media-style" marketplace. Farmers create visual posts of their yields (including weight and price), and local buyers can discover these posts using geolocation, purchasing them directly in bulk.

**Business Model:** Nobanno takes a flat **10% commission** on successful sales to maintain platform infrastructure. (e.g., Customer pays ৳100 → Admin retains ৳10 → Farmer receives ৳90).

---

## 🔄 Platform Workflow
1. **Discovery:** Farmer harvests a crop and creates a "Post" (Image, Name, Total Weight kg, Price per kg).
2. **Matching:** Customer opens the app, allows location access, and searches for products. The algorithm filters and displays posts geographically closest to the customer using Google Maps.
3. **Quantity Selection:** Customer selects a post, chooses the desired quantity (partial purchase allowed — any amount up to the available total weight), and reviews the order summary including a distance-based shipping cost estimate.
4. **Checkout:** Customer completes payment via bKash. The full amount (product cost + shipping) is held by the platform.
5. **Processing:** The order hits the Admin Database. The system logs the 10% platform fee and assigns the remaining 90% payout (of the product cost) as pending for the farmer.
6. **Fulfillment:** The Farmer receives the Customer's delivery address and ships the goods directly via an appropriate carrier based on distance.
7. **Delivery Confirmation:** The Customer confirms delivery in-app once goods are received. This triggers the release of the 90% payout to the Farmer's wallet.
8. **Reviews:** Customer can review and rate the Farmer (out of 5 stars, with optional photos) only after confirming delivery for that specific order.

---

## 👥 User Roles & Features

### 1. 🛡️ Admin (Superuser)
The central authority managing platform health, dispute resolution, and finances.
* **Analytics Dashboard:** View total gross merchandise value (GMV), net 10% profit, active users, and geographical hotspots.
* **User Management:** Suspend, ban, or verify Farmer/Customer accounts.
* **Order Ledger:** Global view of all pending, shipped, and completed orders.
* **Payout Management:** Monitor farmer payouts. Payouts are automatically released upon customer delivery confirmation.

### 2. 🚜 Farmer (Seller)
The supplier side of the marketplace.

**Profile:** Name, average rating, total sales, registered address.

* **Social-Style Listings:** Create visually appealing product posts with ease.
* **Inventory Management:** Update available weight dynamically as orders come in. A post is automatically closed/hidden when remaining weight reaches 0.
* **Order Hub:** Receive push notifications for new orders, view customer delivery addresses, and update shipping statuses.
* **Wallet:** View total earnings, pending payouts (awaiting delivery confirmation), and platform commission deductions.

### 3. 🛒 Customer (Bulk Buyer)
Restaurants, wholesalers, or large families looking for direct farm goods.

**Profile:** Name, delivery address(es), bKash-linked balance.

* **Geo-Search:** View a localised feed of available goods within a configurable radius, powered by Google Maps.
* **Search & Filter:** Find specific crops (e.g., "Potatoes", "Rice") and filter by price or distance.
* **Partial Buying:** Purchase any quantity up to the full available weight of a listing — not limited to buying the entire stock.
* **Shipping Cost:** A distance-based shipping fee is calculated at checkout using Google Maps distance data and displayed to the customer before payment.
* **Secure Checkout:** Pay via bKash payment gateway.
* **Order Tracking:** Monitor shipping status updated directly by the farmer.
* **Delivery Confirmation:** Confirm receipt of goods in-app to release farmer payment and unlock the review.
* **Reviews:** After confirming delivery, leave a rating (1–5 stars) with optional photos for that specific farmer/order. One review per completed order.

---

## 🏗️ System Architecture

### Users Table
Handles authentication, role differentiation (`is_admin`, `is_farmer`, `is_customer`), and geo-coordinates. A single user can hold multiple roles (e.g., a farmer who also buys).

**Authentication:** SMS OTP via phone number. No email/password login.

### Posts / Products Table
Linked to Farmer ID. Contains:
- `title`, `description`, `image_url`
- `total_weight_kg` — original listed amount
- `available_weight_kg` — decremented on each order; post auto-closes at 0
- `price_per_kg` — unit price
- `total_price` — computed field (`price_per_kg × total_weight_kg`), stored for reference
- `latitude`, `longitude` — harvest/pickup location (may differ from farmer's registered address)

### Orders Table
Links Customer ID to Post ID. Contains:
- `quantity_kg` — amount purchased (supports partial orders)
- `product_cost` — `quantity_kg × price_per_kg`
- `shipping_cost` — calculated from Google Maps distance at time of order
- `total_paid` — `product_cost + shipping_cost`
- `platform_fee` — 10% of `product_cost`
- `farmer_payout` — 90% of `product_cost` (shipping cost passed through in full)
- `status` — `Pending` → `Shipped` → `Delivered` (customer-confirmed) → `Completed`
- `bkash_transaction_id` — reference for payment reconciliation

### Reviews Table
Linked to a specific Order ID and Farmer ID. Only created once the order status is `Delivered`. Contains: `rating` (1–5), `comment` (optional), `photo_urls` (optional array).

---

## 💳 Payments

All payments are processed through the **bKash payment gateway**.

- Customers pay the full amount (`product_cost + shipping_cost`) at checkout via bKash.
- Funds are held by the platform until the customer confirms delivery.
- Upon delivery confirmation, the farmer's 90% payout (of product cost) is released to their in-app wallet and disbursed via bKash.
- Shipping cost is passed through to the farmer in full (not subject to the 10% commission).
- Failed payments cancel the order automatically.
- Refund policy and dispute resolution are managed by the Admin.

---

## 🗺️ Maps & Location

**Google Maps Platform** is integrated for:
- Displaying nearby listings on a map feed for customers.
- Calculating straight-line or road distance between farmer post location and customer delivery address for shipping cost estimation.
- Reverse geocoding for address display.

---

## 🚀 Getting Started (Development)

### Prerequisites
* Python 3.10+
* PostgreSQL
* Node.js (for React Native / Expo toolchain)
* Android Studio (latest stable) and/or Xcode (for iOS)
* JDK 17

### Tech Stack
- **Backend:** Django + PostgreSQL
- **Frontend:** React Native (targeting both Android and iOS)
- **Authentication:** SMS OTP (phone number based)
- **Payments:** bKash Payment Gateway
- **Maps:** Google Maps Platform (Maps SDK for React Native + Directions/Distance Matrix API)

### Backend Setup (Django)
1. Clone the repository: `git clone https://github.com/yourusername/nobanno.git`
2. Navigate to the backend directory: `cd nobanno/backend`
3. Create a virtual environment: `python -m venv venv`
4. Activate virtual environment:
    * Windows: `venv\Scripts\activate`
    * Mac/Linux: `source venv/bin/activate`
5. Install dependencies: `pip install -r requirements.txt`
6. Copy `.env.example` to `.env` and fill in your bKash API credentials, Google Maps API key, and SMS gateway credentials.
7. Run migrations: `python manage.py migrate`
8. Create the Admin user: `python manage.py createsuperuser`
9. Start the development server: `python manage.py runserver`

### Frontend Setup (React Native)
1. Navigate to the frontend directory: `cd nobanno/frontend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and set `BASE_URL` to your local Django server (e.g., `http://10.0.2.2:8000/` for Android Emulator) and your Google Maps API key.
4. **Android:** Run `npx react-native run-android` (ensure Android Studio and an emulator/device are ready).
5. **iOS:** Run `cd ios && pod install && cd ..` then `npx react-native run-ios` (requires macOS + Xcode).

---

*Built to bring the harvest home.*
