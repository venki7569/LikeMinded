"""
Seed data utility — loads sample users into the database.
"""
import json
import os
from sqlalchemy.orm import Session
from app.models.user import User


def seed_database(db: Session):
    """Load sample users from JSON file into the database if empty."""
    existing = db.query(User).count()
    if existing > 0:
        print(f"Database already has {existing} users. Skipping seed.")
        return existing

    data_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data", "sample_users.json"
    )

    if not os.path.exists(data_path):
        print(f"Sample data file not found: {data_path}")
        return 0

    with open(data_path, "r", encoding="utf-8") as f:
        users_data = json.load(f)

    count = 0
    for u in users_data:
        user = User(
            name=u["name"],
            email=u["email"],
            domain=u["domain"],
            role=u["role"],
            interests=u["interests"],
            goals=u["goals"],
            bio=u.get("bio", ""),
            skill_level=u.get("skill_level", "intermediate"),
        )
        db.add(user)
        count += 1

    db.commit()
    print(f"Seeded {count} users into the database.")
    return count
