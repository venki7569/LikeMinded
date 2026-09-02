"""
User data model for LikeMinded+.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base


class User(Base):
    """Represents a user profile in the system."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    domain = Column(String(100), nullable=False)        # e.g., "Cricket", "AI/ML"
    role = Column(String(100), nullable=False)           # e.g., "Bowler", "Data Scientist"
    interests = Column(Text, nullable=False)             # Comma-separated: "NLP, Deep Learning, CV"
    goals = Column(Text, nullable=False)                 # Free-text goals description
    bio = Column(Text, default="")                       # Short biography
    skill_level = Column(String(20), default="intermediate")  # beginner/intermediate/advanced
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "domain": self.domain,
            "role": self.role,
            "interests": self.interests,
            "goals": self.goals,
            "bio": self.bio,
            "skill_level": self.skill_level,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
