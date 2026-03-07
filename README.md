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
│   └── issue_repository.py     # Issue data access
│
├── services/                   # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py         # Authentication business logic
│   ├── user_service.py         # User business logic
│   ├── complex_service.py      # Complex business logic
│   ├── building_service.py     # Building business logic
│   ├── announcement_service.py # Announcement business logic
│   ├── vehicle_service.py      # Vehicle business logic
│   └── issue_service.py        # Issue business logic
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
│       └── issues.py           # Issue endpoints
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
- `POST /api/v1/auth/login`: Authenticate and get JWT token.

### Users
- `GET /api/v1/users/me`: Get current user profile.
- `POST /api/v1/users/`: Create a new user (Admin or Manager). Managers' created users are auto-assigned to the manager's complex.
- `GET /api/v1/users/`: List users (Admin sees all, others see self).
- `PUT /api/v1/users/{user_id}`: Update user details (RBAC enforced).
- `DELETE /api/v1/users/{user_id}`: Delete user (Admin only).

### Residential Complexes
- `POST /api/v1/complexes/`: Create complex (Admin only).
- `GET /api/v1/complexes/`: List complexes (RBAC filtered).
- `PUT /api/v1/complexes/{complex_id}`: Update complex (Admin or assigned Manager).
- `POST /api/v1/complexes/assign`: Assign a user to the manager's complex. Complex ID is automatically extracted from the authenticated manager's context. Restricted to Site Managers only.
- `POST /api/v1/complexes/assign/admin`: Admin endpoint to assign a user to any specific complex.
- `GET /api/v1/complexes/{complex_id}/users`: List all users (staff and residents) in a complex.
- `GET /api/v1/complexes/{complex_id}/users-by-role`: List users grouped by role (Admin or assigned Manager).

### Buildings
- `POST /api/v1/buildings/`: Create a building in the manager's complex. Complex ID is automatically extracted from the authenticated manager's context. Restricted to Site Managers only.
- `POST /api/v1/buildings/admin`: Admin endpoint to create a building in any specific complex.
- `GET /api/v1/buildings/`: List buildings (Filtered by assignment).
- `PUT /api/v1/buildings/{building_id}`: Update a building in the manager's complex. Validates that the building belongs to the manager's complex. Restricted to Site Managers only.
- `PUT /api/v1/buildings/admin/{building_id}`: Admin endpoint to update any building including changing its complex assignment.
- `POST /api/v1/buildings/assign`: Assign a resident to a building. Enforces single-building constraint and complex membership check.

### Announcements
- `POST /api/v1/announcements/`: Create announcement for a complex.
- `GET /api/v1/announcements/`: List announcements for assigned complexes.
- `POST /api/v1/announcements/{id}/emotions`: React to an announcement.
- `POST /api/v1/announcements/{id}/comments`: Add a comment (supports tree structure).

### Vehicles
- `POST /api/v1/vehicles/`: Register a vehicle for a user.
- `GET /api/v1/vehicles/`: List vehicles (RBAC filtered).

### Issues/Requests
- `POST /api/v1/issues/`: Report an issue. Complex ID is automatically detected from the user's assignment.
- `POST /api/v1/issues/admin`: Admin-only endpoint to create an issue for any specific complex.
- `GET /api/v1/issues/`: List issues. Managers/Attendants see all in their complex; Residents see their own.
- `PUT /api/v1/issues/{issue_id}`: Update issue status (Management only). Workflow: **OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED**.

## Special Rules

- **Automatic Context:** Many operations (like user creation by managers or issue reporting) automatically determine the `complex_id` from the authenticated user's context.
- **Boundary Protection:** Managers cannot view or modify users, buildings, or issues outside of the complexes they are assigned to.
- **Reaction Logic:** Users can have only one reaction per item; posting a new one replaces the previous. Editing a comment clears all its reactions.
- **Deletions:** Removing an entity (Announcement, Comment, etc.) also cleans up its associated reactions and children.
- **Audit Trails:** All entities track `created_by`, `created_date`, `updated_by`, and `updated_date`.

## Architecture Benefits

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Services and repositories can be easily unit tested
3. **Maintainability**: Changes in one layer don't affect others
4. **Scalability**: Easy to add new features following the same pattern
5. **Reusability**: Repository methods can be reused across services
6. **Clean Code**: Business logic is isolated from HTTP handling
