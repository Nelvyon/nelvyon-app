from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Funnel_items(Base):
    __tablename__ = "funnel_items"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    name = Column(String, nullable=False)
    funnel_type = Column(String, nullable=True)
    status = Column(String, nullable=True)
    stages_count = Column(Integer, nullable=True)
    stages_json = Column(String, nullable=True)
    visitors = Column(Integer, nullable=True)
    leads = Column(Integer, nullable=True)
    conversions = Column(Integer, nullable=True)
    conversion_rate = Column(Float, nullable=True)
    revenue = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)