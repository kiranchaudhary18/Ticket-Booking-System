# Ticket Booking System - Backend

This is the backend REST API for the Ticket Booking System. It provides robust functionality for users, organizers, and administrators to seamlessly manage event ticketing, bookings, real-time seat locks, online payments, and secure ticket issuance.

## Technology Stack

- **Framework**: Django & Django REST Framework (DRF)
- **Database**: PostgreSQL (Neon Database)
- **Authentication**: JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
- **Media/File Storage**: Cloudinary (for event banners, profile pictures, etc.)
- **Payment Gateway**: Razorpay Integration
- **PDF Generation**: ReportLab (for generating PDF tickets)
- **QR Codes**: `qrcode` (for embedding QR codes on PDF tickets)
- **Mailing**: SMTP integration for transactional emails (booking confirmations, tickets)

## Core Modules

- **Accounts (`accounts/`)**: Handles custom User model, Registration, JWT-based Login, Profiles, Roles (`CUSTOMER`, `ORGANIZER`, `ADMIN`), and Password resets.
- **Events (`events/`)**: Handles Event management, Categories, Venues, Shows, and Pricing.
- **Bookings (`events/services/booking_service.py`)**: Real-time optimistic seat locking, concurrent booking handling, and Cart management.
- **Payments (`events/services/razorpay_service.py`)**: Connects to Razorpay to generate Orders and verify Webhook/Signature payments.
- **Tickets (`events/services/ticket_service.py`)**: Automatically triggers upon successful payment to generate PDF e-tickets with QR codes.

## Environment Setup

1. **Clone the repository** and navigate to the `Backend/` directory.
2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment Variables**:
   Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```
   Fill in the variables in `.env` (Database URL, Secret Key, Razorpay credentials, SMTP, Cloudinary URL).

## Database Commands

Ensure your PostgreSQL database is running (or you have your Neon connection string configured).

Apply all migrations:
```bash
python manage.py migrate
```

### Seeding Demo Data

To populate the database with initial categories, venues, events, and mock accounts, you can run:
```bash
python manage.py seed_demo_data
```

## Running the Development Server

Start the Django development server:
```bash
python manage.py runserver
```
The API will be available at `http://localhost:8000/`.

## Important API Areas

- **Auth**: `/api/accounts/` (register, login, refresh, profile)
- **Public Events**: `/api/events/` (browsing, searching, event details)
- **Customer Bookings**: `/api/events/customer/bookings/`, `/api/events/seat-locks/`
- **Payments**: `/api/events/payments/create-order/`, `/api/events/payments/verify/`
- **Organizer Panel**: `/api/events/organizer/` (dashboard stats, managing events, venues, and shows)
- **Admin Panel**: `/api/events/admin/` (platform-wide statistics, revenue reporting, users, events oversight)

## Background Tasks / Management Commands

The system utilizes cron-like management commands for maintaining data integrity:
- `python manage.py cleanup_expired_locks` - Releases locked seats if payment isn't initiated within the grace period.
- `python manage.py cancel_expired_bookings` - Marks pending bookings as expired/cancelled if payment times out.
- `python manage.py retry_failed_notifications` - Retries failed email/ticket deliveries.
