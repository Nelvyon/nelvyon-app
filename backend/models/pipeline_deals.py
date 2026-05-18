from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Pipeline_deals(Base):
    __tablename__ = "pipeline_deals"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    company = Column(String, nullable=True)
    value = Column(Float, nullable=True)
    probability = Column(Integer, nullable=True)
    stage = Column(String, nullable=False)
    owner = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    days_in_stage = Column(Integer, nullable=True)
    last_activity = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)