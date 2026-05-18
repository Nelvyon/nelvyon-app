from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Activities(Base):
    __tablename__ = "activities"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    contact_id = Column(Integer, nullable=True)
    deal_id = Column(Integer, nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_completed = Column(Boolean, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)