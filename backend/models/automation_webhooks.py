from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Automation_webhooks(Base):
    __tablename__ = "automation_webhooks"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    name = Column(String, nullable=False)
    webhook_key = Column(String, nullable=False)
    job_type = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)
    total_calls = Column(Integer, nullable=True)
    last_called_at = Column(String, nullable=True)
    created_at = Column(String, nullable=True)