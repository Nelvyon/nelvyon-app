from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Calendar_events(Base):
    __tablename__ = "calendar_events"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    client_name = Column(String, nullable=True)
    event_type = Column(String, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    channel = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)