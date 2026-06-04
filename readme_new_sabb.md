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

**Business Model:** Nobanno takes a flat **10% commission** on successful sales to maintain platform infrastructure. (e.g., Customer pays $100 -> Admin retains $10 -> Farmer receives $90).

---

## 🔄 Platform Workflow
1. **Discovery:** Farmer harvests a crop and creates a "Post" (Image, Name, Total Weight, Price per kg/total).
2. **Matching:** Customer opens the app, allows location access, and searches for products. The algorithm filters and displays posts geographically closest to the customer.
3. **Checkout:** Customer selects a post and completes the purchase (paying the full amount to the platform).
4. **Processing:** The order hits the Admin Database. The system logs the 10% profit and forwards the remaining 90% payout status and order details to the Farmer.
5. **Fulfillment:** The Farmer receives the Customer's delivery address and ships the goods directly.
6. reviws : cutomer can review and rate out of 5 stars to the farmers. 

---

## 👥 User Roles & Features

### 1. 🛡️ Admin (Superuser)
The central authority managing platform health, dispute resolution, and finances.
* **Analytics Dashboard:** View total gross merchandise value (GMV), net 10% profit, active users, and geographical hotspots.
* **User Management:** Suspend, ban, or verify Farmer/Customer accounts.
* **Order Ledger:** Global view of all pending, shipped, and completed orders.
* **Payout Management:** Trigger the 90% payout to farmers once delivery is confirmed.

### 2. 🚜 Farmer (Seller)
The supplier side of the marketplace.
* **Social-Style Listings:** Create visually appealing product posts with ease.
* **Inventory Management:** Update available weights dynamically as orders come in.
* **Order Hub:** Receive push notifications for new orders, view customer addresses, and update shipping statuses.
* **Wallet:** View total earnings, pending payouts, and platform commission deductions.

### 3. 🛒 Customer (Bulk Buyer)
Restaurants, wholesalers, or large families looking for direct farm goods.
* **Geo-Search:** View a localized feed of available goods within a specific radius.
* **Search & Filter:** Find specific crops (e.g., "Potatoes", "Rice") and filter by price or distance.
* **Secure Checkout:** Pay for goods via integrated payment gateways.
* **Order Tracking:** Monitor the shipping status of purchased goods directly from the farmer.

---



## 🏗️ System Architecture (Brief)

* **Users Table:** Handles authentication, role differentiation (`is_admin`, `is_farmer`, `is_customer`), and geo-coordinates.
* **Posts/Products Table:** Linked to Farmer ID. Contains `title`, `description`, `image_url`, `total_weight_kg`, `price`, `latitude`, `longitude`.
* **Orders Table:** Links Customer ID to Post ID. Tracks `status` (Pending, Shipped, Completed), `total_paid`, `platform_fee`, `farmer_payout`.

---

## 🚀 Getting Started (Development)

### Prerequisites
* Python 3.10+
* PostgreSQL
* Android Studio (Latest stable)
* JDK 17

### Backend Setup (Django)
1. Clone the repository: `git clone https://github.com/yourusername/nobanno.git`
2. Navigate to the backend directory: `cd nobanno/backend`
3. Create a virtual environment: `python -m venv venv`
4. Activate virtual environment:
    * Windows: `venv\Scripts\activate`
    * Mac/Linux: `source venv/bin/activate`
5. Install dependencies: `pip install -r requirements.txt`
6. Run migrations: `python manage.py migrate`
7. Create the Admin user: `python manage.py createsuperuser`
8. Start the development server: `python manage.py runserver`

### Frontend Setup (Jetpack Compose)
1. Open Android Studio.
2. Select **Open an existing project** and navigate to `nobanno/frontend`.
3. Allow Gradle to sync and download necessary dependencies.
4. Update the `BASE_URL` in your network configuration file to point to your local Django server (e.g., `http://10.0.2.2:8000/` for Android Emulator).
5. Build and run the app on an emulator or physical device.

---
*Built to bring the harvest home.*