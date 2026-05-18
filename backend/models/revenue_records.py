from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Revenue_records(Base):
    __tablename__ = "revenue_records"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    source = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=True)
    period = Column(String, nullable=True)
    period_type = Column(String, nullable=True)
    client_name = Column(String, nullable=True)
    plan_id = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)