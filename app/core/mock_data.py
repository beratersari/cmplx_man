from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import UserModel
from app.core.entities import UserRole, ReservationStatus, VisitorStatus
from app.services import (
    ComplexService, BuildingService, UserService, 
    AnnouncementService, VehicleService, VisitorService,
    IssueCategoryService, IssueService,
    ReservationCategoryService, ReservationService,
    MarketplaceCategoryService, MarketplaceItemService,
    PaymentService
)
from app.api.v1.schemas import (
    ResidentialComplexCreate, AdminBuildingCreate,
    UserCreate, UserUpdate, AnnouncementCreate, VehicleCreate, VisitorCreate,
    IssueCategoryCreate, IssueCreate,
    ReservationCategoryCreate, AdminReservationCategoryCreate, ReservationCreate, ReservationStatusUpdate,
    AdminComplexAssignment, BuildingAssignment,
    MarketplaceCategoryCreate, MarketplaceItemCreate,
    VisitorStatusUpdate,
    PaymentCreateForAll, PaymentCreateForSpecific, AdminPaymentCreateForAll, AdminPaymentCreateForSpecific
)

def seed_mock_data(db: Session):
    # Skip if data already exists
    admin_user = db.query(UserModel).filter(UserModel.username == "admin").first()
    if not admin_user:
        return
        
    existing_user = db.query(UserModel).filter(UserModel.username == "manager1").first()
    if existing_user:
        return

    # Instantiate services
    complex_service = ComplexService(db)
    building_service = BuildingService(db)
    user_service = UserService(db)
    announcement_service = AnnouncementService(db)
    vehicle_service = VehicleService(db)
    visitor_service = VisitorService(db)
    issue_category_service = IssueCategoryService(db)
    issue_service = IssueService(db)
    reservation_category_service = ReservationCategoryService(db)
    reservation_service = ReservationService(db)
    marketplace_category_service = MarketplaceCategoryService(db)
    marketplace_item_service = MarketplaceItemService(db)
    payment_service = PaymentService(db)

    # 1. Create Complexes (Admin creates complexes)
    complex_a = complex_service.create_complex(
        ResidentialComplexCreate(name="Sunrise Residency", address="123 Main St"), 
        admin_user
    )
    complex_b = complex_service.create_complex(
        ResidentialComplexCreate(name="Lakeside Towers", address="456 Lake Ave"), 
        admin_user
    )
    complex_c = complex_service.create_complex(
        ResidentialComplexCreate(name="Garden Heights", address="789 Garden Blvd"), 
        admin_user
    )

    # 2. Create Buildings (Admin creates buildings in any complex)
    building_a1 = building_service.admin_create_building(
        AdminBuildingCreate(name="Building A", complex_id=complex_a.id), 
        admin_user
    )
    building_a2 = building_service.admin_create_building(
        AdminBuildingCreate(name="Building B", complex_id=complex_a.id), 
        admin_user
    )
    building_a3 = building_service.admin_create_building(
        AdminBuildingCreate(name="Building C", complex_id=complex_a.id), 
        admin_user
    )
    building_b1 = building_service.admin_create_building(
        AdminBuildingCreate(name="Tower 1", complex_id=complex_b.id), 
        admin_user
    )
    building_b2 = building_service.admin_create_building(
        AdminBuildingCreate(name="Tower 2", complex_id=complex_b.id), 
        admin_user
    )
    building_c1 = building_service.admin_create_building(
        AdminBuildingCreate(name="Block A", complex_id=complex_c.id), 
        admin_user
    )

    # 3. Create Users (Admin creates users)
    manager1 = user_service.create_user(
        UserCreate(username="manager1", email="manager1@example.com", password="manager123", role=UserRole.SITE_MANAGER),
        admin_user
    )
    manager2 = user_service.create_user(
        UserCreate(username="manager2", email="manager2@example.com", password="manager123", role=UserRole.SITE_MANAGER),
        admin_user
    )
    attendant1 = user_service.create_user(
        UserCreate(username="attendant1", email="attendant1@example.com", password="attendant123", role=UserRole.SITE_ATTENDANT),
        admin_user
    )
    attendant2 = user_service.create_user(
        UserCreate(username="attendant2", email="attendant2@example.com", password="attendant123", role=UserRole.SITE_ATTENDANT),
        admin_user
    )
    # Residents with searchable names for testing
    resident1 = user_service.create_user(
        UserCreate(username="john_smith", email="john.smith@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    resident2 = user_service.create_user(
        UserCreate(username="jane_doe", email="jane.doe@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    resident3 = user_service.create_user(
        UserCreate(username="mike_wilson", email="mike.wilson@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    resident4 = user_service.create_user(
        UserCreate(username="sarah_jones", email="sarah.jones@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    resident5 = user_service.create_user(
        UserCreate(username="david_brown", email="david.brown@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    # Additional residents for better search testing
    resident6 = user_service.create_user(
        UserCreate(username="emily_davis", email="emily.davis@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    resident7 = user_service.create_user(
        UserCreate(username="robert_miller", email="robert.miller@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    resident8 = user_service.create_user(
        UserCreate(username="lisa_anderson", email="lisa.anderson@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    resident9 = user_service.create_user(
        UserCreate(username="chris_taylor", email="chris.taylor@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )
    resident10 = user_service.create_user(
        UserCreate(username="amanda_white", email="amanda.white@email.com", password="resident123", role=UserRole.SITE_RESIDENT),
        admin_user
    )

    # 4. Assign Users to Complexes (Admin assigns users to complexes)
    # Manager1 manages complex_a
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=manager1.id, complex_id=complex_a.id), admin_user)
    # Attendant1 works in complex_a
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=attendant1.id, complex_id=complex_a.id), admin_user)
    # Manager2 manages complex_b (business rule: one complex per user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=manager2.id, complex_id=complex_b.id), admin_user)
    # Attendant2 works in complex_b
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=attendant2.id, complex_id=complex_b.id), admin_user)
    # Residents must be assigned to complexes before they can make reservations
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident1.id, complex_id=complex_a.id), admin_user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident2.id, complex_id=complex_a.id), admin_user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident3.id, complex_id=complex_a.id), admin_user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident4.id, complex_id=complex_b.id), admin_user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident5.id, complex_id=complex_c.id), admin_user)
    # Additional residents for search testing
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident6.id, complex_id=complex_a.id), admin_user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident7.id, complex_id=complex_b.id), admin_user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident8.id, complex_id=complex_a.id), admin_user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident9.id, complex_id=complex_b.id), admin_user)
    complex_service.admin_assign_user_to_complex(AdminComplexAssignment(user_id=resident10.id, complex_id=complex_c.id), admin_user)

    # 5. Assign Residents to Buildings (Admin assigns residents to buildings)
    building_service.assign_resident(BuildingAssignment(user_id=resident1.id, building_id=building_a1.id), admin_user)
    building_service.assign_resident(BuildingAssignment(user_id=resident2.id, building_id=building_a2.id), admin_user)
    building_service.assign_resident(BuildingAssignment(user_id=resident3.id, building_id=building_a3.id), admin_user)
    building_service.assign_resident(BuildingAssignment(user_id=resident4.id, building_id=building_b1.id), admin_user)
    building_service.assign_resident(BuildingAssignment(user_id=resident5.id, building_id=building_c1.id), admin_user)
    # Additional residents for search testing
    building_service.assign_resident(BuildingAssignment(user_id=resident6.id, building_id=building_a1.id), admin_user)
    building_service.assign_resident(BuildingAssignment(user_id=resident7.id, building_id=building_b2.id), admin_user)
    building_service.assign_resident(BuildingAssignment(user_id=resident8.id, building_id=building_a2.id), admin_user)
    building_service.assign_resident(BuildingAssignment(user_id=resident9.id, building_id=building_b1.id), admin_user)
    building_service.assign_resident(BuildingAssignment(user_id=resident10.id, building_id=building_c1.id), admin_user)

    # 5.5. Assign Unit Numbers to Residents (via update, same pattern as complex_ids/building_ids)
    user_service.update_user(resident1.id, UserUpdate(unit_number="101"), admin_user)
    user_service.update_user(resident2.id, UserUpdate(unit_number="102"), admin_user)
    user_service.update_user(resident3.id, UserUpdate(unit_number="201"), admin_user)
    user_service.update_user(resident4.id, UserUpdate(unit_number="A-15"), admin_user)
    user_service.update_user(resident5.id, UserUpdate(unit_number="B-04"), admin_user)
    # Additional residents for search testing
    user_service.update_user(resident6.id, UserUpdate(unit_number="103"), admin_user)
    user_service.update_user(resident7.id, UserUpdate(unit_number="B-22"), admin_user)
    user_service.update_user(resident8.id, UserUpdate(unit_number="202"), admin_user)
    user_service.update_user(resident9.id, UserUpdate(unit_number="A-18"), admin_user)
    user_service.update_user(resident10.id, UserUpdate(unit_number="C-01"), admin_user)

    # 6. Create Announcements (Manager creates announcements in their complex)
    announcement1 = announcement_service.create_announcement(
        AnnouncementCreate(title="Welcome to Sunrise Residency", description="We are glad to have you here! Please follow the rules.", complex_id=complex_a.id),
        manager1
    )
    announcement2 = announcement_service.create_announcement(
        AnnouncementCreate(title="Pool Maintenance Notice", description="The pool will be closed for cleaning on Saturday.", complex_id=complex_a.id),
        manager1
    )
    announcement3 = announcement_service.create_announcement(
        AnnouncementCreate(title="Parking Reminder", description="Please park only in designated spaces.", complex_id=complex_b.id),
        manager2
    )
    # Additional announcements for search testing
    announcement4 = announcement_service.create_announcement(
        AnnouncementCreate(title="Community Event: Summer BBQ", description="Join us for our annual summer BBQ at the community garden. Food and drinks provided!", complex_id=complex_a.id),
        manager1
    )
    announcement5 = announcement_service.create_announcement(
        AnnouncementCreate(title="Gym Renovation Update", description="The gym renovation is complete! New equipment has been installed.", complex_id=complex_a.id),
        manager1
    )
    announcement6 = announcement_service.create_announcement(
        AnnouncementCreate(title="Holiday Office Hours", description="The management office will be closed on holidays. Emergency contacts are available.", complex_id=complex_b.id),
        manager2
    )
    announcement7 = announcement_service.create_announcement(
        AnnouncementCreate(title="Package Delivery Notice", description="Please pick up your packages from the concierge within 48 hours.", complex_id=complex_b.id),
        manager2
    )
    announcement8 = announcement_service.create_announcement(
        AnnouncementCreate(title="Fire Safety Drill", description="Annual fire safety drill scheduled for next week. Participation is mandatory.", complex_id=complex_a.id),
        manager1
    )

    # 7. Create Vehicles (Residents create vehicles for themselves)
    vehicle_service.create_vehicle(
        VehicleCreate(user_id=resident1.id, plate_number="ABC-1234", make="Toyota", model="Corolla", color="Blue"),
        resident1
    )
    vehicle_service.create_vehicle(
        VehicleCreate(user_id=resident1.id, plate_number="XYZ-7890", make="Honda", model="Civic", color="Red"),
        resident1
    )
    vehicle_service.create_vehicle(
        VehicleCreate(user_id=resident2.id, plate_number="MNO-4567", make="Ford", model="Focus", color="White"),
        resident2
    )
    vehicle_service.create_vehicle(
        VehicleCreate(user_id=resident4.id, plate_number="QRS-9988", make="Tesla", model="Model 3", color="Black"),
        resident4
    )

    # 8. Create Visitors (Residents create visitors)
    today = datetime.utcnow()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)
    
    visitor1 = visitor_service.create_visitor(
        VisitorCreate(name="John Doe", plate_number="VIS-1001", visit_date=today),
        resident1
    )
    visitor2 = visitor_service.create_visitor(
        VisitorCreate(name="Maria Lopez", plate_number=None, visit_date=today),
        resident2
    )
    visitor3 = visitor_service.create_visitor(
        VisitorCreate(name="Alex Kim", plate_number="VIS-2002", visit_date=yesterday),
        resident3
    )
    visitor4 = visitor_service.create_visitor(
        VisitorCreate(name="Sara Patel", plate_number="VIS-3003", visit_date=today),
        resident4
    )
    
    # Staff updates visitor status
    visitor_service.update_visitor_status(
        visitor1.id,
        VisitorStatusUpdate(status=VisitorStatus.CHECKED_IN),
        attendant1
    )
    visitor_service.update_visitor_status(
        visitor3.id,
        VisitorStatusUpdate(status=VisitorStatus.CHECKED_OUT),
        attendant1
    )
    visitor_service.update_visitor_status(
        visitor4.id,
        VisitorStatusUpdate(status=VisitorStatus.NO_SHOW),
        attendant2
    )

    # 9. Create Issue Categories (Managers create categories in their complex)
    cat_maintenance_a = issue_category_service.create_category_in_my_complex(
        IssueCategoryCreate(name="Maintenance Request"),
        manager1
    )
    cat_security_a = issue_category_service.create_category_in_my_complex(
        IssueCategoryCreate(name="Security Concern"),
        manager1
    )
    cat_noise_a = issue_category_service.create_category_in_my_complex(
        IssueCategoryCreate(name="Noise Complaint"),
        manager1
    )
    cat_maintenance_b = issue_category_service.create_category_in_my_complex(
        IssueCategoryCreate(name="Maintenance Request"),
        manager2
    )
    cat_parking_b = issue_category_service.create_category_in_my_complex(
        IssueCategoryCreate(name="Parking Issue"),
        manager2
    )

    # 10. Create Issues (Residents create issues)
    issue_service.create_issue(
        IssueCreate(title="Leaking faucet in kitchen", description="The kitchen faucet has been leaking for 3 days.", category_id=cat_maintenance_a.id),
        resident1
    )
    issue_service.create_issue(
        IssueCreate(title="Suspicious person at gate", description="Saw an unknown person trying to enter through the side gate.", category_id=cat_security_a.id),
        resident2
    )
    issue_service.create_issue(
        IssueCreate(title="Loud music from upstairs", description="Neighbor plays loud music after midnight.", category_id=cat_noise_a.id),
        resident3
    )
    issue_service.create_issue(
        IssueCreate(title="Parking spot occupied", description="Someone is parking in my assigned spot.", category_id=cat_parking_b.id),
        resident4
    )

    # 11. Create Reservation Categories (Managers create categories in their complex)
    res_cat_tennis = reservation_category_service.create_category_in_my_complex(
        ReservationCategoryCreate(name="Tennis Court"),
        manager1
    )
    res_cat_pool = reservation_category_service.create_category_in_my_complex(
        ReservationCategoryCreate(name="Swimming Pool"),
        manager1
    )
    res_cat_bbq = reservation_category_service.create_category_in_my_complex(
        ReservationCategoryCreate(name="BBQ Area"),
        manager1
    )
    res_cat_gym = reservation_category_service.create_category_in_my_complex(
        ReservationCategoryCreate(name="Gym"),
        manager2
    )
    res_cat_party = reservation_category_service.create_category_in_my_complex(
        ReservationCategoryCreate(name="Party Room"),
        manager2
    )
    # Admin creates category for complex_c (since no manager is assigned to complex_c)
    res_cat_clubhouse = reservation_category_service.admin_create_category(
        AdminReservationCategoryCreate(name="Clubhouse", complex_id=complex_c.id),
        admin_user
    )

    # 12. Create Reservations (Residents create reservations)
    # Resident1 creates a pending reservation
    res1 = reservation_service.create_reservation(
        ReservationCreate(
            category_id=res_cat_tennis.id, 
            reservation_date=tomorrow, 
            start_hour="10:00", 
            end_hour="12:00", 
            person_count=2,
            notes="Looking forward to playing tennis!"
        ),
        resident1
    )
    
    # Resident2 creates a pending reservation
    res2 = reservation_service.create_reservation(
        ReservationCreate(
            category_id=res_cat_pool.id, 
            reservation_date=tomorrow, 
            start_hour="14:00", 
            end_hour="16:00", 
            person_count=4,
            notes="Swimming with family"
        ),
        resident2
    )
    
    # Resident3 creates a reservation (will be accepted)
    res3 = reservation_service.create_reservation(
        ReservationCreate(
            category_id=res_cat_bbq.id, 
            reservation_date=tomorrow, 
            start_hour="18:00", 
            end_hour="22:00", 
            person_count=15,
            notes="Birthday party"
        ),
        resident3
    )
    
    # Manager1 accepts resident3's reservation
    reservation_service.update_reservation_status(
        res3.id, 
        ReservationStatusUpdate(status="ACCEPTED"), 
        manager1
    )
    
    # Resident4 creates a reservation
    res4 = reservation_service.create_reservation(
        ReservationCreate(
            category_id=res_cat_gym.id, 
            reservation_date=tomorrow, 
            start_hour="17:00", 
            end_hour="19:00", 
            person_count=1,
            notes=None
        ),
        resident4
    )
    
    # Manager2 accepts resident4's reservation
    reservation_service.update_reservation_status(
        res4.id, 
        ReservationStatusUpdate(status="ACCEPTED"), 
        manager2
    )
    
    # Resident5 creates a reservation (will be rejected)
    res5 = reservation_service.create_reservation(
        ReservationCreate(
            category_id=res_cat_clubhouse.id, 
            reservation_date=yesterday, 
            start_hour="10:00", 
            end_hour="14:00", 
            person_count=50,
            notes="Big gathering"
        ),
        resident5
    )
    
    # Admin rejects resident5's reservation (since no manager for complex_c)
    reservation_service.update_reservation_status(
        res5.id, 
        ReservationStatusUpdate(status="REJECTED"), 
        admin_user
    )
    
    # Resident1 creates another pending reservation
    reservation_service.create_reservation(
        ReservationCreate(
            category_id=res_cat_tennis.id, 
            reservation_date=tomorrow + timedelta(days=7), 
            start_hour="08:00", 
            end_hour="10:00", 
            person_count=2,
            notes="Weekly tennis match"
        ),
        resident1
    )

    # 13. Mark some announcements as read (via get-by-id to apply read logic)
    announcement_service.get_announcement_by_id(announcement1.id, resident1)
    announcement_service.get_announcement_by_id(announcement1.id, resident2)
    announcement_service.get_announcement_by_id(announcement2.id, resident1)
    announcement_service.get_announcement_by_id(announcement3.id, resident4)

    # 14. Create Marketplace Categories
    m_cat_electronics = marketplace_category_service.create_category_in_my_complex(
        MarketplaceCategoryCreate(name="Electronics"),
        manager1
    )
    m_cat_furniture = marketplace_category_service.create_category_in_my_complex(
        MarketplaceCategoryCreate(name="Furniture"),
        manager1
    )
    m_cat_books = marketplace_category_service.create_category_in_my_complex(
        MarketplaceCategoryCreate(name="Books"),
        manager2
    )

    # 15. Create Marketplace Items
    marketplace_item_service.create_item(
        MarketplaceItemCreate(
            category_id=m_cat_electronics.id,
            title="Used iPhone 12",
            description="Good condition, 64GB, space gray.",
            price=450.0,
            img_paths=["/imgs/iphone12_1.jpg", "/imgs/iphone12_2.jpg"]
        ),
        resident1
    )
    marketplace_item_service.create_item(
        MarketplaceItemCreate(
            category_id=m_cat_furniture.id,
            title="Office Chair",
            description="Ergonomic chair, barely used.",
            price=75.0,
            img_paths=["/imgs/chair.jpg"]
        ),
        resident2
    )
    marketplace_item_service.create_item(
        MarketplaceItemCreate(
            category_id=m_cat_books.id,
            title="Python Programming",
            description="Great book for beginners.",
            price=20.0,
            img_paths=[]
        ),
        resident4
    )
    
    # 16. Create Payments (Managers create payments for their complexes)
    # Manager1 creates a monthly maintenance fee for ALL units in complex_a
    payment1 = payment_service.create_payment_for_all(
        PaymentCreateForAll(
            title="Monthly Maintenance Fee - March",
            amount=150.00,
            due_date=today + timedelta(days=15)
        ),
        manager1
    )
    
    # Manager1 creates a special assessment for specific units
    payment2 = payment_service.create_payment_for_specific(
        PaymentCreateForSpecific(
            title="Elevator Repair Assessment",
            amount=75.00,
            unit_numbers=["101", "102"],
            due_date=today + timedelta(days=30)
        ),
        manager1
    )
    
    # Manager2 creates a parking fee for all units in complex_b
    payment3 = payment_service.create_payment_for_all(
        PaymentCreateForAll(
            title="Monthly Parking Fee - March",
            amount=50.00,
            due_date=today + timedelta(days=10)
        ),
        manager2
    )
    
    # Admin creates a payment for complex_c (no manager assigned)
    payment4 = payment_service.admin_create_payment_for_all(
        AdminPaymentCreateForAll(
            title="Annual Maintenance Fee",
            amount=200.00,
            complex_id=complex_c.id,
            due_date=today + timedelta(days=60)
        ),
        admin_user
    )
    
    print("Mock data seeding completed successfully!")
