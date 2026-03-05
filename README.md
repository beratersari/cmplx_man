# Apartment Complex Management Application

A FastAPI-based application for managing apartment complexes, built using Clean Architecture.

## Features
- **User Roles:** Admin, Site Manager, Site Attendant, Site Resident.
- **Role-Based Access Control (RBAC):**
  - **Admin:** Manage all residential complexes, buildings, and users.
  - **Site Manager:** Manage their assigned residential complexes and buildings. Can assign other managers/attendants to their complexes.
  - **Site Attendant:** Limited operations on assigned complexes.
  - **Site Resident:** Assigned to a building via a separate relationship table.
- **Audit Logging:** Tracks `created_date`, `created_by`, `update_date`, and `updated_by`.
- **Account Management:** Uses `is_active` for user status.

## Tech Stack
- **Framework:** FastAPI
- **Database:** SQLite (SQLAlchemy ORM)
- **Authentication:** JWT (jose), Bcrypt
- **Architecture:** Clean Architecture

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

## Mock Data
On startup, the application seeds mock data (if no complexes exist) including:
- Two residential complexes
- Multiple buildings
- Manager, attendant, and resident accounts

## Project Structure
- `app/domain`: Core entities and business logic.
- `app/use_cases`: Application-specific business rules.
- `app/infrastructure`: Database, security, and external services.
- `app/interfaces`: API endpoints and controllers.

## API Endpoints
- `/api/v1/auth/login`: Authenticate and get JWT token.
- `/api/v1/users/`: Manage users (CRUD). Includes `contact` and `description` fields.
- `/api/v1/complexes/`: Manage residential complexes (CRUD).
- `/api/v1/complexes/assign`: Assign managers/attendants to complexes.
- `/api/v1/complexes/{complex_id}/users`: List residents assigned to a complex (admins or assigned managers).
- `/api/v1/buildings/`: Manage buildings within complexes (CRUD).
- `/api/v1/buildings/assign`: Assign residents to buildings.
- `/api/v1/buildings/{building_id}/users`: List residents assigned to a building (admins or assigned managers).
- `/api/v1/vehicles/`: Manage vehicles (CRUD, residents can have multiple vehicles).
- `/api/v1/announcements/`: Manage announcements (CRUD). Includes detailed reactions and comment tree.
- `/api/v1/announcements/{id}/emotions`: React to announcements (Single reaction per user).
- `/api/v1/announcements/{id}/reactions`: Get detailed reaction info.
- `/api/v1/announcements/{id}/comments`: Add/Manage comments (Tree structure).
- `/api/v1/announcements/comments/{id}/emotions`: React to comments.
- `/api/v1/announcements/comments/{id}/reactions`: Get detailed reaction info for comments.

### Special Rules
- **Announcement Visibility:** Users only see announcements for complexes they are assigned to or buildings they reside in.
- **Comment Edits:** When a comment is edited, all its existing reactions are automatically reset (deleted).
- **Single Reaction:** A user can only have one reaction per announcement or comment. Posting a new reaction will replace the old one.
- **Deletions:** Removing an entity (Announcement, Comment, etc.) also cleans up its associated reactions and children.
- **Audit Trails:** All entities track `created_by`, `created_date`, `updated_by`, and `updated_date`.
