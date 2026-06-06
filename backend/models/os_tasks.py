"""NELVYON OS canonical tasks (migration 317)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, Date, DateTime, Integer, JSON, String, Text

from core.database import Base


class Os_tasks(Base):
    __tablename__ = "os_tasks"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    project_id = Column(String(36), nullable=True, index=True)
    client_id = Column(String(36), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")
    priority = Column(String, nullable=False, default="medium")
    assignee = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    task_metadata = Column("metadata", JSON, nullable=False, default=dict)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
