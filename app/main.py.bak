from fastapi import FastAPI
from app.infrastructure.database import engine, Base
from app.infrastructure.models import UserModel
from app.infrastructure.security import get_password_hash
from app.domain.entities import UserRole
from app.infrastructure.database import SessionLocal
from app.infrastructure.mock_data import seed_mock_data
from app.interfaces.api.v1 import auth, users, complexes, buildings, announcements, vehicles

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Apartment Management API",
    description="API for managing apartment complexes with role-based access control.",
    version="1.0.0"
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(complexes.router, prefix="/api/v1/complexes", tags=["Residential Complexes"])
app.include_router(buildings.router, prefix="/api/v1/buildings", tags=["Buildings"])
app.include_router(announcements.router, prefix="/api/v1/announcements", tags=["Announcements"])
app.include_router(vehicles.router, prefix="/api/v1/vehicles", tags=["Vehicles"])

@app.on_event("startup")
def startup_event():
    # Create initial admin user if not exists
    db = SessionLocal()
    try:
        admin_user = db.query(UserModel).filter(UserModel.username == "admin").first()
        if not admin_user:
            admin_user = UserModel(
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
        seed_mock_data(db)
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Apartment Management API. Visit /docs for Swagger documentation."}
