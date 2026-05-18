from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String


class Form_items(Base):
    __tablename__ = "form_items"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    name = Column(String, nullable=False)
    form_type = Column(String, nullable=False)
    status = Column(String, nullable=True)
    fields_count = Column(Integer, nullable=True)
    responses_count = Column(Integer, nullable=True)
    completion_rate = Column(Integer, nullable=True)
    conversion_rate = Column(Float, nullable=True)
    avg_time_seconds = Column(Integer, nullable=True)
    fields_json = Column(String, nullable=True)
    ai_optimized = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)