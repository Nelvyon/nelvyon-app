from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Contacts(Base):
    __tablename__ = "contacts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    status = Column(String, nullable=True)
    source = Column(String, nullable=True)
    score = Column(Integer, nullable=True)
    avatar_url = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)