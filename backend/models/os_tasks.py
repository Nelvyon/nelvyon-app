from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Text


class Os_tasks(Base):
    __tablename__ = "os_tasks"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pendiente")
    priority = Column(String, nullable=True, default="media")
    due_date = Column(String, nullable=True)
    client_id = Column(Integer, nullable=True)
    project_id = Column(Integer, nullable=True)
    assignee = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
