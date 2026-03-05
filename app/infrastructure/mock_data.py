from sqlalchemy.orm import Session
from app.infrastructure.models import ResidentialComplexModel, BuildingModel, UserModel, AnnouncementModel, AnnouncementEmotionModel, CommentModel, CommentEmotionModel, VehicleModel
from app.infrastructure.security import get_password_hash
from app.domain.entities import UserRole

def seed_mock_data(db: Session):
    # Skip if data already exists
    existing_complex = db.query(ResidentialComplexModel).first()
    existing_user = db.query(UserModel).filter(UserModel.username == "manager1").first()
    if existing_complex or existing_user:
        return

    complex_a = ResidentialComplexModel(name="Sunrise Residency", address="123 Main St", created_by=1)
    complex_b = ResidentialComplexModel(name="Lakeside Towers", address="456 Lake Ave", created_by=1)
    complex_c = ResidentialComplexModel(name="Garden Heights", address="789 Garden Blvd", created_by=1)
    db.add_all([complex_a, complex_b, complex_c])
    db.commit()

    building_a1 = BuildingModel(name="Building A", complex_id=complex_a.id, created_by=1)
    building_a2 = BuildingModel(name="Building B", complex_id=complex_a.id, created_by=1)
    building_a3 = BuildingModel(name="Building C", complex_id=complex_a.id, created_by=1)
    building_b1 = BuildingModel(name="Tower 1", complex_id=complex_b.id, created_by=1)
    building_b2 = BuildingModel(name="Tower 2", complex_id=complex_b.id, created_by=1)
    building_c1 = BuildingModel(name="Block A", complex_id=complex_c.id, created_by=1)
    building_c2 = BuildingModel(name="Block B", complex_id=complex_c.id, created_by=1)
    db.add_all([building_a1, building_a2, building_a3, building_b1, building_b2, building_c1, building_c2])
    db.commit()

    manager = UserModel(
        username="manager1",
        email="manager1@example.com",
        hashed_password=get_password_hash("manager123"),
        role=UserRole.SITE_MANAGER,
        is_active=True,
        created_by=1
    )
    manager2 = UserModel(
        username="manager2",
        email="manager2@example.com",
        hashed_password=get_password_hash("manager123"),
        role=UserRole.SITE_MANAGER,
        is_active=True,
        created_by=1
    )
    attendant = UserModel(
        username="attendant1",
        email="attendant1@example.com",
        hashed_password=get_password_hash("attendant123"),
        role=UserRole.SITE_ATTENDANT,
        is_active=True,
        created_by=1
    )
    attendant2 = UserModel(
        username="attendant2",
        email="attendant2@example.com",
        hashed_password=get_password_hash("attendant123"),
        role=UserRole.SITE_ATTENDANT,
        is_active=True,
        created_by=1
    )
    resident1 = UserModel(
        username="resident1",
        email="resident1@example.com",
        hashed_password=get_password_hash("resident123"),
        role=UserRole.SITE_RESIDENT,
        is_active=True,
        created_by=1
    )
    resident2 = UserModel(
        username="resident2",
        email="resident2@example.com",
        hashed_password=get_password_hash("resident123"),
        role=UserRole.SITE_RESIDENT,
        is_active=True,
        created_by=1
    )
    resident3 = UserModel(
        username="resident3",
        email="resident3@example.com",
        hashed_password=get_password_hash("resident123"),
        role=UserRole.SITE_RESIDENT,
        is_active=True,
        created_by=1
    )
    resident4 = UserModel(
        username="resident4",
        email="resident4@example.com",
        hashed_password=get_password_hash("resident123"),
        role=UserRole.SITE_RESIDENT,
        is_active=True,
        created_by=1
    )
    resident5 = UserModel(
        username="resident5",
        email="resident5@example.com",
        hashed_password=get_password_hash("resident123"),
        role=UserRole.SITE_RESIDENT,
        is_active=True,
        created_by=1
    )
    db.add_all([manager, manager2, attendant, attendant2, resident1, resident2, resident3, resident4, resident5])
    db.commit()

    # Assign managers and attendants to complexes
    complex_a.assigned_users.append(manager)
    complex_a.assigned_users.append(attendant)
    complex_b.assigned_users.append(manager2)
    complex_b.assigned_users.append(attendant2)
    complex_c.assigned_users.append(manager2)

    # Assign residents to buildings
    building_a1.residents.append(resident1)
    building_a2.residents.append(resident2)
    building_a3.residents.append(resident3)
    building_b1.residents.append(resident4)
    building_c1.residents.append(resident5)
    db.commit()

    # Add mock announcements
    announcement = AnnouncementModel(
        title="Welcome to Sunrise Residency",
        description="We are glad to have you here! Please follow the rules.",
        complex_id=complex_a.id,
        comments_enabled=True,
        created_by=manager.id
    )
    announcement2 = AnnouncementModel(
        title="Pool Maintenance Notice",
        description="The pool will be closed for cleaning on Saturday.",
        complex_id=complex_a.id,
        comments_enabled=True,
        created_by=manager.id
    )
    announcement3 = AnnouncementModel(
        title="Parking Reminder",
        description="Please park only in designated spaces.",
        complex_id=complex_b.id,
        comments_enabled=False,
        created_by=manager2.id
    )
    db.add_all([announcement, announcement2, announcement3])
    db.commit()

    # Add some reactions
    reaction1 = AnnouncementEmotionModel(announcement_id=announcement.id, user_id=resident1.id, emoji=":happy:")
    reaction2 = AnnouncementEmotionModel(announcement_id=announcement.id, user_id=attendant.id, emoji=":heart:")
    reaction3 = AnnouncementEmotionModel(announcement_id=announcement2.id, user_id=resident2.id, emoji=":sad:")
    reaction4 = AnnouncementEmotionModel(announcement_id=announcement3.id, user_id=resident4.id, emoji=":angry:")
    db.add_all([reaction1, reaction2, reaction3, reaction4])
    db.commit()

    # Add comments
    comment1 = CommentModel(
        content="Thank you for the warm welcome!",
        announcement_id=announcement.id,
        created_by=resident1.id
    )
    comment2 = CommentModel(
        content="You're welcome! Let us know if you need anything.",
        announcement_id=announcement.id,
        parent_id=comment1.id,
        created_by=manager.id
    )
    comment3 = CommentModel(
        content="Will the pool open next week?",
        announcement_id=announcement2.id,
        created_by=resident2.id
    )
    db.add_all([comment1, comment2, comment3])
    db.commit()

    # Add reaction to comment
    comment_reaction = CommentEmotionModel(comment_id=comment1.id, user_id=manager.id, emoji=":heart:")
    comment_reaction2 = CommentEmotionModel(comment_id=comment3.id, user_id=attendant2.id, emoji=":surprised:")
    db.add_all([comment_reaction, comment_reaction2])
    db.commit()

    # Add vehicles for residents
    vehicle1 = VehicleModel(
        user_id=resident1.id,
        plate_number="ABC-1234",
        make="Toyota",
        model="Corolla",
        color="Blue",
        created_by=resident1.id
    )
    vehicle2 = VehicleModel(
        user_id=resident1.id,
        plate_number="XYZ-7890",
        make="Honda",
        model="Civic",
        color="Red",
        created_by=resident1.id
    )
    vehicle3 = VehicleModel(
        user_id=resident2.id,
        plate_number="MNO-4567",
        make="Ford",
        model="Focus",
        color="White",
        created_by=resident2.id
    )
    vehicle4 = VehicleModel(
        user_id=resident4.id,
        plate_number="QRS-9988",
        make="Tesla",
        model="Model 3",
        color="Black",
        created_by=resident4.id
    )
    db.add_all([vehicle1, vehicle2, vehicle3, vehicle4])
    db.commit()
