from fastapi import FastAPI, Request
from app.core.database import engine, Base, SessionLocal
from app.models.models import UserModel
from app.core.security import get_password_hash
from app.core.entities import UserRole
from app.core.mock_data import seed_mock_data
from app.core.rate_limiter import rate_limit_middleware
from app.api.v1 import auth, users, complexes, buildings, announcements, vehicles, issues, visitors, categories, reservation_categories, reservations
from app.core.logging_config import logger
import time

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Apartment Management API",
    description="API for managing apartment complexes with role-based access control.",
    version="1.0.0"
)


# Rate limiting middleware - must be added before other middleware
@app.middleware("http")
async def rate_limit(request: Request, call_next):
    """Rate limiting middleware for DDoS protection."""
    return await rate_limit_middleware(request, call_next)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}ms".format(process_time)
    logger.info(f"RID: {request.scope.get('root_path')} - {request.method} {request.url.path} - Status: {response.status_code} - Completed in {formatted_process_time}")
    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy
    if not request.url.path.startswith("/docs"):
        response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    # Strict Transport Security (HSTS)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Permissions Policy (formerly Feature Policy)
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    return response


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(complexes.router, prefix="/api/v1/complexes", tags=["Residential Complexes"])
app.include_router(buildings.router, prefix="/api/v1/buildings", tags=["Buildings"])
app.include_router(announcements.router, prefix="/api/v1/announcements", tags=["Announcements"])
app.include_router(vehicles.router, prefix="/api/v1/vehicles", tags=["Vehicles"])
app.include_router(issues.router, prefix="/api/v1/issues", tags=["Issues/Requests"])
app.include_router(visitors.router, prefix="/api/v1/visitors", tags=["Visitors"])
app.include_router(categories.router, prefix="/api/v1/issue-categories", tags=["Issue Categories"])
app.include_router(reservation_categories.router, prefix="/api/v1/reservation-categories", tags=["Reservation Categories"])
app.include_router(reservations.router, prefix="/api/v1/reservations", tags=["Reservations"])


@app.on_event("startup")
def startup_event():
    """Initialize database with admin user and mock data."""
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
    """Root endpoint returning welcome message."""
    return {"message": "Welcome to Apartment Management API. Visit /docs for Swagger documentation."}


@app.get("/health")
def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {"status": "healthy", "service": "apartment-management-api"}
