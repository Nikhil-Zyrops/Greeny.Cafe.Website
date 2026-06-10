# Greeny Cafe Website 🌿☕

A modern, full-stack, and self-contained Café Management & Ordering System. This project features a high-performance **Next.js frontend** and a robust **Laravel API backend**, utilizing a completely portable, local development environment with **PHP 8.3** and **MariaDB 11.4** pre-configured.

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [Tech Stack](#-tech-stack)
3. [Repository Structure](#-repository-structure)
4. [Key Features](#-key-features)
5. [Local Development Setup](#%EF%B8%8F-local-development-setup)
6. [API Architecture & Endpoints](#%EF%B8%8F-api-architecture--endpoints)
7. [Licensing](#-licensing)

---

## 🌿 Overview
**Greeny Cafe Website** is built to streamline the operations of a modern café. It handles everything from customer-facing menu browsing and order tracking to staff management, real-time inventory tracking, and sales analytics. 

To simplify development onboarding, the project includes setup scripts that configure completely self-contained (portable) binaries for PHP, Composer, and MariaDB directly inside the workspace folder. No global system installations are required.

---

## 💻 Tech Stack

### Frontend
* **Framework:** Next.js 15.5.19 (App Router)
* **Library:** React 19.1.0
* **Styling:** Tailwind CSS v4 (with `@tailwindcss/postcss`)
* **State Management:** Zustand 5.0.14
* **Animations:** Framer Motion 12.40.0
* **UI Components:** `@base-ui/react`, Shadcn, Lucide React (Icons), Sonner (Toasts)
* **HTTP Client:** Axios

### Backend
* **Framework:** Laravel 13.8 (API-only setup)
* **Language:** PHP 8.3
* **Authentication:** JSON Web Tokens (JWT) via `tymon/jwt-auth`
* **Local Console Utilities:** Laravel Tinker, Laravel Pail, Laravel Pint

### Database & Environment
* **Database:** MariaDB 11.4.2 (MySQL compatible)
* **Local Setup Scripts:** PowerShell-based installation of portable PHP and MariaDB.

---

## 📁 Repository Structure
```text
Greeny-Cafe/
├── backend/            # Laravel API application
├── frontend/           # Next.js frontend web app
├── php/                # [Git-ignored] Local portable PHP & Composer binaries
├── mariadb/            # [Git-ignored] Local portable MariaDB server & data directories
├── setup_env.ps1       # Setup script for PHP & Composer
├── setup_mariadb.ps1   # Setup script for MariaDB & configurations
├── .gitignore          # Root-level ignore rules
└── README.md           # This documentation
```

---

## ✨ Key Features

1. **Customer Order Flow:**
   * Browsing dynamic, categorized menus.
   * Real-time order placement.
   * Direct order tracking.
   * Automated/interactive WhatsApp notifications.

2. **Staff & Kitchen Management:**
   * Kitchen/counter dashboard showing active orders.
   * Micro-status transitions (Pending ➡️ Preparing ➡️ Ready ➡️ Completed).
   * Staff performance metric logging.

3. **Admin & Backoffice:**
   * Complete Menu CRUD (Create, Read, Update, Delete) and item availability toggling.
   * Real-time Inventory Management: Track ingredient/item quantities.
   * Comprehensive Analytics dashboard: Sales summaries, calendar activity, top-selling items, peak sales hours, and weekly revenue graphs.

4. **Super Admin Controls:**
   * Staff accounts registration, roles assignment, and access controls.
   * System-wide global settings management.
   * Audit Logs tracking all critical administrative operations.
   * Backup/Restore system (DB dump/restore straight from the dashboard).

---

## 🛠️ Local Development Setup

To run this application locally on Windows, follow these instructions. 

### 1. Initialize the Portable Environment (Run Once)
Open PowerShell inside the repository root (`C:\Codes\Greeny-Cafe`) and run:
```powershell
# 1. Download, configure, and install portable PHP 8.3 & Composer locally
.\setup_env.ps1

# 2. Download, configure, and initialize MariaDB 11.4 database catalog
.\setup_mariadb.ps1
```

### 2. Start the Local Database
Run the MariaDB daemon with the local configuration file:
```powershell
.\mariadb\bin\mysqld.exe --defaults-file=mariadb\my.ini
```
*Note: Keep this terminal window open, or run it in the background.*

### 3. Backend Setup & Run
Open a new terminal, navigate to the `backend` directory, and set up Laravel:
```powershell
cd backend

# Install PHP dependencies
..\php\php.exe ..\php\composer.phar install

# Set up local environment files (.env)
Copy-Item .env.example .env

# Generate application key
..\php\php.exe artisan key:generate

# Run Database Migrations and Seeders
..\php\php.exe artisan migrate --seed

# Start Laravel Development API Server
..\php\php.exe artisan serve
```
The backend API server will run at `http://127.0.0.1:8000`.

### 4. Frontend Setup & Run
Open a new terminal, navigate to the `frontend` directory:
```powershell
cd frontend

# Install Node dependencies
npm install

# Run the Next.js development server
npm run dev
```
The frontend web application will run at `http://localhost:3000`.

---

## 🔌 API Architecture & Endpoints

All backend endpoints are prefixed with `/api` and return standardized JSON responses.

### Public Endpoints
* `POST /api/auth/login` - Authenticate staff/admin to retrieve a JWT.
* `GET /api/menu` - Fetch all active menu items.
* `GET /api/menu/{id}` - Fetch single menu item detail.
* `POST /api/orders` - Place a new order.
* `GET /api/orders/{order_number}/track` - Track live status of an order.
* `POST /api/orders/{id}/whatsapp` - Send WhatsApp notifications for order status.

### Authenticated Endpoints (Requires JWT)

#### Staff Access (`role:staff,admin,super_admin`)
* `POST /api/auth/logout` - Revoke current session token.
* `GET /api/auth/me` - Profile info of the authenticated user.
* `GET /api/orders` - List all orders.
* `PATCH /api/orders/{id}/status` - Advance order status.
* `GET /api/staff/performance` - Retrieve performance reports.

#### Admin Access (`role:admin,super_admin`)
* **Menu Control:** `POST /menu`, `PUT /menu/{id}`, `DELETE /menu/{id}`, `PATCH /menu/{id}/toggle`.
* **Inventory Control:** `GET /inventory`, `POST /inventory`, `PUT /inventory/{id}`, `DELETE /inventory/{id}`.
* **Analytics Reports:** `/api/analytics/summary`, `/api/analytics/top-items`, `/api/analytics/peak-hours`, `/api/analytics/weekly-revenue`.

#### Super Admin Access (`role:super_admin`)
* **Users Management:** Full CRUD on `/api/super/users`.
* **System Operations:** Update global configuration, review `Audit Logs`.
* **Disaster Recovery:** `/api/super/backups`, `POST /api/super/backup` (Trigger db dump), `POST /api/super/restore` (Restore db dump).
