# Apartment Complex Management Application

A FastAPI-based application for managing apartment complexes, built using Clean Architecture.

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

## Project Structure
- `app/domain`: Core entities and business logic.
- `app/infrastructure`: Database, security, and logging configuration.
- `app/interfaces`: API endpoints (v1) and Pydantic schemas.

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
- `POST /api/v1/complexes/assign`: Assign a user to a complex (Admin or assigned Manager). Enforces single-complex constraint.
- `GET /api/v1/complexes/{complex_id}/users`: List all users (staff and residents) in a complex.
- `GET /api/v1/complexes/{complex_id}/users-by-role`: List users grouped by role (Admin or assigned Manager).

### Buildings
- `POST /api/v1/buildings/`: Create building in a complex.
- `GET /api/v1/buildings/`: List buildings (Filtered by assignment).
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
