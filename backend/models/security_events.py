from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Security_events(Base):
    __tablename__ = "security_events"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    severity = Column(String, nullable=True)
    source = Column(String, nullable=True)
    description = Column(String, nullable=True)
    status = Column(String, nullable=True)
    details_json = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)