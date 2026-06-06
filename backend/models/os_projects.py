"""NELVYON OS canonical projects (migration 316)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, Date, DateTime, Integer, JSON, Numeric, String, Text

from core.database import Base


class Os_projects(Base):
    __tablename__ = "os_projects"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    client_id = Column(String(36), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="draft")
    priority = Column(String, nullable=False, default="medium")
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    budget = Column(Numeric(14, 2), nullable=True)
    project_metadata = Column("metadata", JSON, nullable=False, default=dict)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
