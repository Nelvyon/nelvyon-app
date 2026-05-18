from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class User_roles(Base):
    __tablename__ = "user_roles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, nullable=False)
    permissions_json = Column(String, nullable=True)
    assigned_by = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)