# Viceroy Resort & Residences - Web Application

A full-stack luxury resort management and reservation platform built with React, Node.js, Express, and MongoDB, aligned with the **Resort Booking & Management System - 20 Modules Planning Specification**.

---

## Architecture & Module Implementation Overview

### 1. Single Unified Admin Dashboard (`/admin`)
All 4 core administrative functions are accessible on a **single unified page**:
- **🛏️ Room Management & Live Counters**:
  - Live counters for **Available Rooms**, **Booked Rooms**, **Total Inventory**, and **Occupancy Rate (%)**.
  - **Add Room**: Specify Room Number, Suite Name, Category, Price/Night, Max Capacity, Amenities, Description, and Photo.
  - **Remove Room**: Permanently delete suites from the inventory with confirmation.
  - **1-Click Availability Toggle**: Instantly flip room status between `Available` and `Booked` with dynamic badge updates.
  - **Search & Filter**: Filter suites by status (`All`, `Available`, `Booked`) or search by suite name and room number.
- **📅 Booking Operations & Reservations**:
  - Live booking history table with reference IDs, guest details, room names, stay dates, total amounts, and payment status.
  - **Check-In Guest**: Sets booking status to `checked-in` and records check-in timestamp.
  - **Check-Out Guest**: Sets booking status to `checked-out`, frees the suite back to `Available`, and records checkout timestamp.
  - **Cancel Booking**: Automatically cancels booking, marks payment refunded, and frees up the suite.
  - Quick filters for `All`, `Confirmed`, `Checked-In`, `Checked-Out`, and `Cancelled`.
- **📩 Concierge Inquiries (Read & Reply)**:
  - Displays all guest messages submitted via the public homepage inquiry form.
  - **Reply via Email**: Directly reply to inquiries with an integrated luxury email modal dispatched through Nodemailer.
  - **Reply History**: Keeps track of reply subject, message content, replying admin, and timestamp.
- **👤 Admin Profile & Account Settings**:
  - Displays admin name, email, role badge (`admin`), and account creation date.
  - Edit personal profile details (Full Name, Phone Number, Address).
  - Update administrative password securely with current password verification.
- **⭐ Review Moderation**:
  - Moderate guest reviews: Toggle review visibility (`Published` / `Hidden`) or delete inappropriate reviews.

---

### 2. Guest-Facing & Customer Features

- **Landing Page (`/`)**:
  - Hero showcase with luxury Viceroy aesthetic.
  - Interactive residence preview displaying live suites from MongoDB.
  - Customer review carousel showing verified, published guest testimonials.
  - **Concierge Inquiry Form**: Public form allowing guests to submit inquiries without logging in; inquiries appear in real-time on the Admin Dashboard.
- **Unified Authentication (`/login`, `/signup`)**:
  - **No separate admin login URL**: All users log in through `/login`.
  - Admin vs Customer role is stored in MongoDB (`User.role`).
  - Admins are automatically routed to `/admin`; customers are redirected to `/booking` or their intended page.
- **Protected Booking Flow (`/booking`)**:
  - **Login Required**: Unauthenticated guests are automatically redirected to `/login?redirect=/booking`.
  - **Double-Booking Prevention**: Validates date overlap against confirmed and checked-in bookings before saving.
  - Dynamic stay pricing calculation based on selected dates and suite rates.
  - Payment options: Credit/Debit Card, UPI / Net Banking, or Pay at Resort.
- **Booking Confirmation Receipt (`/booking/confirmation/:id`)**:
  - Dedicated luxury invoice and confirmation receipt with unique reference code (`VR-XXXXXX`).
  - Full breakdown of stay dates, nights, guests, suite information, payment status, and price breakdown.
  - One-click print/download action (`window.print()`).
- **Customer Profile (`/profile`)**:
  - View personal details and update phone number / address.
  - Secure password change for customer accounts.
  - **My Reservations**: View past, current, and upcoming reservations with status badges.
  - Direct links to view booking confirmation receipts.
  - Cancel active reservations.
  - **Submit Review**: Leave a verified rating (1 to 5 stars) and testimonial for completed stays.

---

## Directory Structure

```text
viceroy-resort/
├── client/                     # React Vite Frontend
│   ├── public/images/          # Suite images & brand assets
│   ├── src/
│   │   ├── api/
│   │   │   └── adminApi.js     # Centralized API service methods
│   │   ├── components/
│   │   │   ├── AdminRoute.jsx  # Route guard for admin role
│   │   │   ├── ProtectedRoute.jsx # Route guard for logged-in users
│   │   │   └── Navbar.jsx      # Navigation header with role-aware links
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx  # Single-page unified admin view
│   │   │   │   └── AdminDashboard.css
│   │   │   ├── Booking.jsx             # Protected booking reservation flow
│   │   │   ├── BookingConfirmation.jsx # Dedicated confirmation receipt
│   │   │   ├── Home.jsx                # Landing page with rooms & inquiries
│   │   │   ├── Login.jsx               # Unified login page
│   │   │   ├── Profile.jsx             # Customer profile & reservations
│   │   │   └── Signup.jsx              # Customer account registration
│   │   └── App.jsx                     # Route declarations
│   └── package.json
└── server/                     # Express & Node.js Backend
    ├── controllers/
    │   ├── authController.js     # User & admin profile, login, signup
    │   ├── bookingController.js  # Reservations, overlap check, checkin/out
    │   ├── enquiryController.js  # Public inquiries & admin email replies
    │   ├── paymentController.js  # Payment transaction logs
    │   ├── reviewController.js   # Customer reviews & moderation
    │   └── roomController.js     # Suite inventory CRUD & live stats
    ├── middleware/
    │   └── authMIddleware.js     # JWT token auth & adminOnly gatekeeper
    ├── models/
    │   ├── Booking.js            # Reservation schema with status tracking
    │   ├── Enquiry.js            # Guest inquiries & reply logs
    │   ├── Payment.js            # Payment & refund schema
    │   ├── Review.js             # Ratings & moderation status
    │   ├── Room.js               # Suite inventory schema
    │   └── User.js               # User accounts with role ('customer'|'admin')
    ├── routes/                   # Express REST API routes
    ├── scripts/
    │   ├── createAdmin.js        # CLI utility to create/promote admin
    │   └── seed.js               # Initial database seeder
    ├── server.js                 # Express server entry point
    └── package.json
```

---

## Getting Started

### 1. Database & Environment Setup
Make sure MongoDB is running on your machine (e.g. `mongodb://127.0.0.1:27017/resort_booking`).
The backend environment is configured in `viceroy-resort/server/.env`:
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/resort_booking
JWT_SECRET=viceroy_luxury_resort_secret_key_2026
```

### 2. Seed Initial Database Data
Run the database seed script to populate default rooms, sample inquiries, and create the default admin user:
```bash
cd viceroy-resort/server
npm run seed
```

### 3. Creating or Updating an Admin Account
To create an admin or promote an existing account, run the CLI utility:
```bash
cd viceroy-resort/server
node scripts/createAdmin.js admin@viceroyresort.com admin123 "Viceroy General Manager"
```

### 4. Running the Application
Open two separate terminal windows:

**Terminal 1 (Backend Server):**
```bash
cd viceroy-resort/server
npm run dev
# Running on http://localhost:4000
```

**Terminal 2 (Frontend Client):**
```bash
cd viceroy-resort/client
npm run dev
# Running on http://localhost:5173
```

---

## Default Administrative Credentials
- **Login URL:** `http://localhost:5173/login`
- **Email:** `admin@viceroyresort.com`
- **Password:** `admin123`
- **Role:** `admin` (stored in MongoDB `User.role`)
- **Admin Dashboard:** `http://localhost:5173/admin` (automatically redirected upon login)
