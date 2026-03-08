# Apartment Complex Management Application

A FastAPI-based application for managing apartment complexes, built using N-Layered Architecture with clear separation of concerns.

## Architecture Overview

This application follows an **N-Layered Architecture** pattern, which provides clear separation of concerns and maintainability:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                           │
│                   (API Endpoints / Routes)                       │
│                      app/api/                                    │
├─────────────────────────────────────────────────────────────────┤
│                     Service Layer                                │
│                   (Business Logic)                               │
│                     app/services/                                │
├─────────────────────────────────────────────────────────────────┤
│                   Repository Layer                               │
│                  (Data Access)                                   │
│                    app/repositories/                             │
├─────────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                            │
│         (Database, Security, Logging, Models)                    │
│           app/core/ + app/models/                               │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **Presentation Layer** (`app/api/`)
   - Handles HTTP requests and responses
   - Input validation via Pydantic schemas
   - Authentication and authorization dependencies
   - Routes requests to appropriate services
   - Contains no business logic

2. **Service Layer** (`app/services/`)
   - Contains business logic and rules
   - Orchestrates repository calls
   - Handles authorization checks
   - Manages transactions
   - Returns domain models

3. **Repository Layer** (`app/repositories/`)
   - Abstracts database operations
   - Provides CRUD operations
   - Encapsulates query logic
   - Returns ORM models

4. **Core/Models Layer** (`app/core/` + `app/models/`)
   - Database configuration and session management
   - SQLAlchemy ORM models
   - Security utilities (password hashing, JWT)
   - Logging configuration
   - Domain entities and enums

## Features

- **User Roles:** Admin, Site Manager, Site Attendant, Site Resident.
- **Role-Based Access Control (RBAC):**
  - **Admin:** Full system access. Can manage all complexes, buildings, users, and vehicles.
  - **Site Manager:** Manage their assigned residential complexes and buildings. Can create and manage users within their assigned complexes.
  - **Site Attendant:** View and manage operations (like issues) within assigned complexes.
  - **Site Resident:** Access to their own profile, vehicles, complex announcements, and reporting issues.
- **Audit Logging:** Every entity tracks `created_date`, `created_by`, `updated_date`, and `updated_by`.
- **Structured Logging:** Dual logging to console (colorful) and `app.log` (JSON format for ElasticSearch).
- **Data Integrity Constraints:**
  - A user can belong to **at most one building**.
  - A user can belong to **at most one complex**.
  - Site Managers can only assign or create users within the complexes they manage.
  - Residents must be assigned to a complex before they can be assigned to a building within it.

## Tech Stack

- **Framework:** FastAPI
- **Database:** SQLite (SQLAlchemy ORM)
- **Authentication:** JWT (jose), Bcrypt
- **Logging:** Python native logging + `python-json-logger` + `colorlog`

## Project Structure

```
app/
├── core/                       # Core configuration and utilities
│   ├── __init__.py
│   ├── entities.py             # Domain entities and enums
│   ├── database.py             # Database configuration
│   ├── security.py             # Password hashing and JWT
│   ├── logging_config.py       # Logging setup
│   └── mock_data.py            # Seed data
│
├── models/                      # Database models (ORM)
│   ├── __init__.py
│   └── models.py               # SQLAlchemy ORM models
│
├── repositories/               # Data access layer
│   ├── __init__.py
│   ├── base_repository.py      # Generic CRUD operations
│   ├── user_repository.py      # User data access
│   ├── complex_repository.py   # Complex data access
│   ├── building_repository.py  # Building data access
│   ├── announcement_repository.py # Announcement data access
│   ├── vehicle_repository.py   # Vehicle data access
│   ├── issue_repository.py     # Issue data access
│   ├── visitor_repository.py   # Visitor data access
│   ├── issue_category_repository.py  # Issue Category data access
│   ├── reservation_category_repository.py  # Reservation Category data access
│   ├── reservation_repository.py      # Reservation data access
│   ├── marketplace_category_repository.py  # Marketplace Category data access
│   ├── marketplace_item_repository.py      # Marketplace Item data access
│   └── payment_repository.py   # Payment data access
│
├── services/                   # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py         # Authentication business logic
│   ├── user_service.py         # User business logic
│   ├── complex_service.py      # Complex business logic
│   ├── building_service.py     # Building business logic
│   ├── announcement_service.py # Announcement business logic
│   ├── vehicle_service.py      # Vehicle business logic
│   ├── issue_service.py        # Issue business logic
│   ├── visitor_service.py      # Visitor business logic
│   ├── issue_category_service.py     # Issue Category business logic
│   ├── reservation_category_service.py # Reservation Category business logic
│   ├── reservation_service.py        # Reservation business logic
│   ├── marketplace_category_service.py  # Marketplace Category business logic
│   ├── marketplace_item_service.py      # Marketplace Item business logic
│   └── payment_service.py      # Payment business logic
│
├── api/                        # Presentation layer
│   ├── __init__.py
│   ├── deps.py                 # Authentication dependencies
│   └── v1/                     # API version 1
│       ├── __init__.py
│       ├── schemas.py          # Pydantic schemas
│       ├── auth.py             # Authentication endpoints
│       ├── users.py            # User endpoints
│       ├── complexes.py        # Complex endpoints
│       ├── buildings.py        # Building endpoints
│       ├── announcements.py    # Announcement endpoints
│       ├── vehicles.py         # Vehicle endpoints
│       ├── issues.py           # Issue endpoints
│       ├── visitors.py         # Visitor endpoints
│       ├── categories.py       # Issue Category endpoints
│       ├── reservation_categories.py  # Reservation Category endpoints
│       ├── reservations.py     # Reservation endpoints
│       ├── marketplace_categories.py  # Marketplace Category endpoints
│       ├── marketplace_items.py      # Marketplace Item endpoints
│       └── payments.py         # Payment endpoints
│
└── main.py                     # Application entry point
```

## Data Flow

```
Request → API Endpoint → Service Layer → Repository Layer → Database
                ↓              ↓               ↓
           Validation     Business Logic   Data Access
                ↓              ↓               ↓
Response ← Schema ← Domain Model ← ORM Model
```

## Key Design Principles

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Dependency Injection**: Services receive repositories through constructor injection
3. **Single Responsibility**: Each service handles one domain entity
4. **Repository Pattern**: Abstracts database operations from business logic
5. **Clean API Endpoints**: Endpoints are thin and delegate to services

## Getting Started

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```

3. Access Swagger UI: `http://localhost:8000/docs`

## Initial Admin User

The application automatically creates an initial admin user on startup:
- **Username:** `admin`
- **Password:** `admin123`

## API Endpoints

### Pagination
All collection GET endpoints support pagination via `skip` and `limit` query parameters (default `skip=0`, `limit=50`).

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Authenticate and get JWT token. |

### Users

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/users/` | Create a new user (Admins can create any role; Managers can create any role except ADMIN, and created users are auto-assigned to the manager’s complexes). |
| GET | `/api/v1/users/me` | Get current user profile. |
| GET | `/api/v1/users/` | List users (Admins see all, others only see themselves). |
| GET | `/api/v1/users/search` | Search users by username, email, unit_number, or contact (Admins can search all; Managers can search within their complexes). |
| PUT | `/api/v1/users/{user_id}` | Update user details (RBAC enforced). |
| DELETE | `/api/v1/users/{user_id}` | Delete user (Admin only; super admin cannot be deleted). |

### Residential Complexes

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/complexes/` | Create complex (Admin only). |
| GET | `/api/v1/complexes/` | List complexes (Admins see all; others see assigned complexes). |
| POST | `/api/v1/complexes/assign` | Assign a user to the manager’s complex (Site Managers only). |
| POST | `/api/v1/complexes/assign/admin` | Admin endpoint to assign a user to any complex. |
| GET | `/api/v1/complexes/me` | Get the authenticated manager’s complex (Site Managers only). |
| GET | `/api/v1/complexes/me/users` | List users in the manager’s complex (Site Managers only). |
| GET | `/api/v1/complexes/me/users-by-role` | List users in the manager’s complex grouped by role (Site Managers only). |
| PUT | `/api/v1/complexes/me` | Update the manager’s complex details (Site Managers only). |
| GET | `/api/v1/complexes/{complex_id}/users` | Admin: list users in a complex. |
| GET | `/api/v1/complexes/{complex_id}/users-by-role` | Admin: list users in a complex grouped by role. |
| PUT | `/api/v1/complexes/{complex_id}` | Admin: update any complex. |
| DELETE | `/api/v1/complexes/{complex_id}` | Admin: delete any complex. |

### Buildings

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/buildings/` | Create a building in the manager’s complex (Site Managers only). |
| POST | `/api/v1/buildings/admin` | Admin: create a building in any complex. |
| POST | `/api/v1/buildings/assign` | Assign a resident to a building (Admins or assigned Site Managers). |
| GET | `/api/v1/buildings/{building_id}/users` | List users assigned to a building (Admins or users in the complex). |
| PUT | `/api/v1/buildings/{building_id}` | Update a building in the manager’s complex (Site Managers only). |
| PUT | `/api/v1/buildings/admin/{building_id}` | Admin: update any building including complex assignment. |
| DELETE | `/api/v1/buildings/{building_id}` | Delete a building (Admins or assigned Site Managers). |
| GET | `/api/v1/buildings/` | List buildings (Admins see all; others see assigned complexes; filter by `complex_id`). |

### Announcements

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/announcements/` | Create an announcement for a complex. |
| GET | `/api/v1/announcements/` | List announcements (Admins see all; others see assigned complexes; filter by `complex_id`). |
| GET | `/api/v1/announcements/search` | Search announcements by title or description (Admins can search all; others can search within their assigned complexes). |
| GET | `/api/v1/announcements/{announcement_id}` | Get a specific announcement by ID and mark it as read. |
| POST | `/api/v1/announcements/{announcement_id}/emotions` | React to an announcement. |
| GET | `/api/v1/announcements/{announcement_id}/reactions` | List announcement reactions. |
| PUT | `/api/v1/announcements/{announcement_id}` | Update an announcement. |
| DELETE | `/api/v1/announcements/{announcement_id}` | Delete an announcement. |
| POST | `/api/v1/announcements/{announcement_id}/comments` | Create a top-level comment on an announcement. |
| POST | `/api/v1/announcements/{announcement_id}/replies` | Create a reply to a comment on an announcement. |
| POST | `/api/v1/announcements/comments/{comment_id}/emotions` | React to a comment. |
| GET | `/api/v1/announcements/comments/{comment_id}/reactions` | List comment reactions. |
| PUT | `/api/v1/announcements/comments/{comment_id}` | Update a comment (creator only). |
| DELETE | `/api/v1/announcements/comments/{comment_id}` | Delete a comment (creator, Admins, or assigned Site Managers). |
| DELETE | `/api/v1/announcements/{announcement_id}/emotions` | Remove the current user’s reaction from an announcement. |
| DELETE | `/api/v1/announcements/comments/{comment_id}/emotions` | Remove the current user’s reaction from a comment. |
| GET | `/api/v1/announcements/{announcement_id}/read-stats` | Get read/unread statistics for an announcement (Staff only). |

### Visitors

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/visitors/` | Register a visitor for the authenticated user's complex (name required, plate optional; `building_id` derived from user building or `0`). |
| GET | `/api/v1/visitors/` | Visitors see their own visitors from the last 7 days; managers/attendants see all visitors in their complex from the last 7 days. |
| GET | `/api/v1/visitors/manager` | Managers only: list visitors for a specific date (`visit_date` parameter). |
| PUT | `/api/v1/visitors/{visitor_id}` | Update a visitor (creator, admin, or manager of same complex). |
| PUT | `/api/v1/visitors/{visitor_id}/status` | Update visitor status (staff only: admin, manager, or attendant). Statuses: PENDING, CHECKED_IN, CHECKED_OUT, NO_SHOW. |
| DELETE | `/api/v1/visitors/{visitor_id}` | Delete a visitor (creator, admin, or manager of same complex). |
| GET | `/api/v1/visitors/admin/list` | Admin: list visitors for any complex (requires `complex_id`; optional `visit_date`). |
| PUT | `/api/v1/visitors/admin/{visitor_id}` | Admin: update any visitor. |
| DELETE | `/api/v1/visitors/admin/{visitor_id}` | Admin: delete any visitor. |
| GET | `/api/v1/visitors/stats/by-building` | Visitor counts grouped by building for manager's complex. |
| GET | `/api/v1/visitors/stats/by-building/admin` | Visitor counts grouped by building for a specific complex (admin only; requires `complex_id`). |
| GET | `/api/v1/visitors/stats/by-user` | Visitor counts grouped by username for manager's complex. |
| GET | `/api/v1/visitors/stats/by-user/admin` | Visitor counts grouped by username for a specific complex (admin only; requires `complex_id`). |

### Vehicles

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/vehicles/` | Register a vehicle for a user. |
| GET | `/api/v1/vehicles/` | List vehicles (Admins see all; Site Managers see vehicles in their complexes; Residents see own vehicles). |
| PUT | `/api/v1/vehicles/{vehicle_id}` | Update a vehicle (Admins, vehicle owner, or assigned Site Managers). |
| DELETE | `/api/v1/vehicles/{vehicle_id}` | Delete a vehicle (Admins, vehicle owner, or assigned Site Managers). |
| GET | `/api/v1/vehicles/stats` | Vehicle statistics for the manager’s complex (manager-only). |
| GET | `/api/v1/vehicles/stats/admin` | Vehicle statistics for a specific complex (admin only; requires `complex_id`). |

### Issue Categories

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/issue-categories/` | Create an issue category in the manager's complex (Site Managers only). |
| POST | `/api/v1/issue-categories/admin` | Admin: create an issue category in any complex. |
| GET | `/api/v1/issue-categories/` | List issue categories (Admins see all; Managers see their complex; Users see their assigned complex). |
| PUT | `/api/v1/issue-categories/{category_id}` | Update an issue category in the manager's complex (Site Managers only). |
| PUT | `/api/v1/issue-categories/admin/{category_id}` | Admin: update any issue category including complex assignment. |
| DELETE | `/api/v1/issue-categories/{category_id}` | Delete an issue category (Admins or assigned Site Managers). |

### Issues/Requests

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/issues/` | Report an issue or request (complex inferred from user assignment; `building_id` derived from user building or `0`; **category_id is required**). |
| POST | `/api/v1/issues/admin` | Admin: create an issue for any complex (building derived from admin’s building or `0`). |
| GET | `/api/v1/issues/` | List issues (Managers/Attendants see all in their complexes; Residents see their own; filter by `complex_id`). |
| PUT | `/api/v1/issues/{issue_id}` | Update issue status/details (Admins, Managers, or Attendants; workflow: OPEN → IN_PROGRESS → RESOLVED → CLOSED). |
| GET | `/api/v1/issues/stats/status` | Issue status summary for manager’s complex. |
| GET | `/api/v1/issues/stats/status/admin` | Issue status summary for a specific complex (admin only; requires `complex_id`). |
| GET | `/api/v1/issues/stats/daily` | Daily issue counts for manager’s complex (optional `start_date`, `end_date`). |
| GET | `/api/v1/issues/stats/daily/admin` | Daily issue counts for a specific complex (admin only; requires `complex_id`, optional `start_date`, `end_date`). |
| GET | `/api/v1/issues/stats/closed-by-user` | Closed issue counts grouped by updater for manager’s complex. |
| GET | `/api/v1/issues/stats/closed-by-user/admin` | Closed issue counts grouped by updater for a specific complex (admin only; requires `complex_id`). |
| GET | `/api/v1/issues/stats/by-building` | Issue counts grouped by building for manager’s complex. |
| GET | `/api/v1/issues/stats/by-building/admin` | Issue counts grouped by building for a specific complex (admin only; requires `complex_id`). |
| GET | `/api/v1/issues/stats/by-user` | Issue counts grouped by reporter for manager’s complex. |
| GET | `/api/v1/issues/stats/by-user/admin` | Issue counts grouped by reporter for a specific complex (admin only; requires `complex_id`). |
| GET | `/api/v1/issues/stats/by-category` | Issue counts grouped by category for manager's complex. |
| GET | `/api/v1/issues/stats/by-category/admin` | Issue counts grouped by category for a specific complex (admin only; requires `complex_id`). |

### Reservation Categories

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/reservation-categories/` | Create a reservation category in the manager's complex (Site Managers only). |
| POST | `/api/v1/reservation-categories/admin` | Admin: create a reservation category in any complex. |
| GET | `/api/v1/reservation-categories/` | List reservation categories (Admins see all; Managers see their complex; Users see their assigned complex; filter by `complex_id`). |
| PUT | `/api/v1/reservation-categories/{category_id}` | Update a reservation category in the manager's complex (Site Managers only). |
| PUT | `/api/v1/reservation-categories/admin/{category_id}` | Admin: update any reservation category including complex assignment. |
| DELETE | `/api/v1/reservation-categories/{category_id}` | Delete a reservation category (Admins or assigned Site Managers). |

### Reservations

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/reservations/` | Create a reservation for the current user (Users can make reservations in their assigned complex; status is PENDING by default). |
| POST | `/api/v1/reservations/admin` | Admin: create a reservation for any user in any complex. |
| GET | `/api/v1/reservations/` | List reservations (Admins see all; Managers/Attendants see their complex; Residents see their own; filter by `complex_id`, `date`, and `status`). |
| GET | `/api/v1/reservations/my` | Get all reservations for the current user. |
| GET | `/api/v1/reservations/overlap-stats` | Get statistics about other accepted reservations that overlap with a given time interval (requires `category_id`, `date`, `start_hour`, and `end_hour`). |
| GET | `/api/v1/reservations/{reservation_id}` | Get a specific reservation by ID (Authorized for owner, admin, manager, and staff). |
| GET | `/api/v1/reservations/{reservation_id}/overlap-stats` | Get statistics about other accepted reservations that overlap with a specific reservation (requires `reservation_id`; returns count and total people). |
| PUT | `/api/v1/reservations/{reservation_id}` | Update a reservation (Users can update their own; Admins/Managers can update reservations in their complex). |
| PUT | `/api/v1/reservations/{reservation_id}/status` | Update reservation status to ACCEPTED or REJECTED (Admin, Managers, and Staff only). |
| DELETE | `/api/v1/reservations/{reservation_id}` | Cancel a reservation (Users can cancel their own; Admins/Managers can cancel reservations in their complex). |

### Marketplace Categories

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/marketplace-categories/` | Create a marketplace category in the manager's complex (Site Managers/Attendants only). |
| POST | `/api/v1/marketplace-categories/admin` | Admin: create a marketplace category in any complex. |
| GET | `/api/v1/marketplace-categories/` | List marketplace categories (Admins see all; others see their complex). |
| PUT | `/api/v1/marketplace-categories/{category_id}` | Update a marketplace category in the manager's complex (Site Managers/Attendants only). |
| PUT | `/api/v1/marketplace-categories/admin/{category_id}` | Admin: update any marketplace category. |
| DELETE | `/api/v1/marketplace-categories/{category_id}` | Delete a marketplace category. |

### Marketplace Items

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/marketplace-items/` | Create a new marketplace item (All users; auto-fills contact from profile). |
| GET | `/api/v1/marketplace-items/` | List marketplace items (Scoped to user complex; auto-expires old items). |
| GET | `/api/v1/marketplace-items/my` | List marketplace items created by the current user. |
| GET | `/api/v1/marketplace-items/{item_id}` | Get a specific marketplace item. |
| PUT | `/api/v1/marketplace-items/{item_id}` | Update a marketplace item (Owner only; supports relisting). |
| DELETE | `/api/v1/marketplace-items/{item_id}` | Delete a marketplace item (Owner, Admin, or Staff in same complex for spam moderation). |

### Payments

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/payments/for-all` | Create a payment for ALL units in the manager's complex (Site Managers only). |
| POST | `/api/v1/payments/for-specific` | Create a payment for specific unit numbers in the manager's complex (Site Managers only). |
| GET | `/api/v1/payments/` | List payments for the manager's complex (Site Managers only). |
| GET | `/api/v1/payments/{payment_id}` | Get a specific payment by ID. |
| PUT | `/api/v1/payments/{payment_id}` | Update a payment (Manager/Admin only). |
| DELETE | `/api/v1/payments/{payment_id}` | Delete a payment (soft delete; Manager/Admin only). |
| PUT | `/api/v1/payments/{payment_id}/records/{record_id}/status` | Update a payment record's status (Staff only: admin, manager, attendant). |
| GET | `/api/v1/payments/{payment_id}/stats` | Get statistics for a payment (Staff only). |
| GET | `/api/v1/payments/stats/by-building` | Get payment statistics grouped by building for the manager’s complex (Staff only). |
| GET | `/api/v1/payments/list/by-building` | List all payment records grouped by building for the manager’s complex (Staff only). |
| GET | `/api/v1/payments/my/unit-payments` | List payment records for the unit assigned to the current user. |
| POST | `/api/v1/payments/admin/for-all` | Admin: Create a payment for ALL units in any complex. |
| POST | `/api/v1/payments/admin/for-specific` | Admin: Create a payment for specific unit numbers in any complex. |
| GET | `/api/v1/payments/admin/list` | Admin: List all payments, optionally filtered by complex. |
| GET | `/api/v1/payments/admin/stats/by-building` | Admin: Get payment statistics grouped by building for a complex (requires `complex_id`). |
| GET | `/api/v1/payments/admin/list/by-building` | Admin: List all payment records grouped by building for a complex (requires `complex_id`). |

## Special Rules

- **User Unit Numbers:** Each user can have an associated `unit_number` to track where they live within a complex or building. Unit numbers are assigned via user update (PUT `/api/v1/users/{user_id}`), following the same pattern as `complex_ids` and `building_ids` assignments. They are not set during user creation.
- **Payment Tracking System:** Managers can create payments for units. Two publishing strategies:
  - **For All Units:** Payment is created for all unique unit numbers in the complex.
  - **For Specific Units:** Payment is created only for specified unit numbers.
- **Payment Records:** Each payment automatically creates individual payment records for each target unit number. Records track status (PENDING, PAID, OVERDUE, CANCELLED) and paid date. Multi-resident units share the same payment record for the unit.
- **Payment Statistics:** Staff can view payment statistics including total records, collected amount, and pending amount.
- **Marketplace Expiration:** Items automatically expire after 30 days. They can be relisted by the owner by updating with `relist=true`.
- **Marketplace Images:** Items can have multiple image paths for display.
- **Marketplace Spam Moderation:** Managers and Attendants can delete marketplace items in their complex to remove spam.
- **Visitor Status Tracking:** Visitors have a status field (PENDING, CHECKED_IN, CHECKED_OUT, NO_SHOW) that can be updated by staff (admin, manager, or attendant).
- **Automatic Context:** Many operations (like user creation by managers or issue reporting) automatically determine the `complex_id` from the authenticated user's context.
- **Boundary Protection:** Managers cannot view or modify users, buildings, or issues outside of the complexes they are assigned to.
- **Reaction Logic:** Users can have only one reaction per item; posting a new one replaces the previous. Editing a comment clears all its reactions.
- **Deletions:** Removing an entity (Announcement, Comment, etc.) also cleans up its associated reactions and children.
- **Audit Trails:** All entities track `created_by`, `created_date`, `updated_by`, and `updated_date`.
- **Reservation Workflow:** Reservations start with PENDING status. Admin, Managers, and Staff can update the status to ACCEPTED or REJECTED. The system tracks who updated the status (`status_updated_by`) and when (`status_updated_date`).

## Security Features

### Rate Limiting and DDoS Protection

The API implements multiple layers of rate limiting to protect against DDoS attacks:

#### Global Rate Limits (per IP)
- **Per Second:** 20 requests
- **Per Minute:** 200 requests
- **Per Hour:** 5,000 requests

#### Endpoint-Specific Limits
- **Auth Endpoints (login, register):** 10 requests/minute (stricter to prevent brute force)
- **Write Operations (POST, PUT, DELETE):** 50 requests/minute
- **Read Operations (GET):** 100 requests/minute

#### Burst Protection
- Maximum 10 concurrent requests in a 1-second burst window

#### Blocking
- IPs that violate rate limits are blocked for 5 minutes
- Blocked IPs receive HTTP 429 (Too Many Requests) with `Retry-After` header

#### Request Size Limits
- Maximum request body size: 10 MB

### Security Headers

All responses include the following security headers:

| Header | Value | Purpose |
| --- | --- | --- |
| `X-Frame-Options` | `DENY` | Prevents clickjacking attacks |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enables browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information |
| `Content-Security-Policy` | `default-src 'self'` | Prevents XSS and injection attacks |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS connections |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Restricts browser features |

### Rate Limit Headers

API responses include rate limit information:

| Header | Description |
| --- | --- |
| `X-RateLimit-Limit` | Maximum requests allowed per minute |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `Retry-After` | Seconds until rate limit resets (only when limited) |

### Whitelisted Endpoints

The following endpoints are not rate-limited:
- `/` - Root endpoint
- `/health` - Health check endpoint
- `/docs` - Swagger UI
- `/redoc` - ReDoc documentation
- `/openapi.json` - OpenAPI schema

### Configuration

Rate limiting can be configured in `app/core/rate_limiter.py`:

```python
class RateLimitConfig:
    GLOBAL_REQUESTS_PER_SECOND = 20
    GLOBAL_REQUESTS_PER_MINUTE = 200
    GLOBAL_REQUESTS_PER_HOUR = 5000
    AUTH_REQUESTS_PER_MINUTE = 10
    WRITE_REQUESTS_PER_MINUTE = 50
    READ_REQUESTS_PER_MINUTE = 100
    BURST_SIZE = 10
    BLOCK_DURATION_SECONDS = 300
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10 MB
```

## Architecture Benefits

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Services and repositories can be easily unit tested
3. **Maintainability**: Changes in one layer don't affect others
4. **Scalability**: Easy to add new features following the same pattern
5. **Reusability**: Repository methods can be reused across services
6. **Clean Code**: Business logic is isolated from HTTP handling
