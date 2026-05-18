from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Appointments(Base):
    __tablename__ = "appointments"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True)
    contact_id = Column(Integer, nullable=True)
    contact_name = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    type = Column(String, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, nullable=True)
    location = Column(String, nullable=True)
    reminder_sent = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)