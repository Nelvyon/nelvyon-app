from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Pricing_promos(Base):
    __tablename__ = "pricing_promos"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    promo_type = Column(String, nullable=True)
    discount_percent = Column(Integer, nullable=True)
    code = Column(String, nullable=True)
    plan_id = Column(String, nullable=True)
    billing_cycle = Column(String, nullable=True)
    active = Column(Boolean, nullable=True)
    valid_from = Column(String, nullable=True)
    valid_until = Column(String, nullable=True)
    created_at = Column(String, nullable=True)