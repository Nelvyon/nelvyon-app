from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Partner_records(Base):
    __tablename__ = "partner_records"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    partner_name = Column(String, nullable=False)
    company = Column(String, nullable=True)
    email = Column(String, nullable=True)
    tier = Column(String, nullable=True)
    status = Column(String, nullable=True)
    referrals_count = Column(Integer, nullable=True)
    conversions_count = Column(Integer, nullable=True)
    revenue_generated = Column(Float, nullable=True)
    commission_rate = Column(Float, nullable=True)
    commission_earned = Column(Float, nullable=True)
    joined_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)