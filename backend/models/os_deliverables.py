"""NELVYON OS canonical deliverables (migration 318)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from core.database import Base


class Os_deliverables(Base):
    __tablename__ = "os_deliverables"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    client_id = Column(String(36), nullable=False, index=True)
    project_id = Column(String(36), nullable=False, index=True)
    task_id = Column(String(36), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    visibility = Column(String, nullable=False, default="internal")
    file_url = Column(String, nullable=True)
    storage_key = Column(String, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    review_notes = Column(Text, nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    client_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_portal_user_id = Column(String(36), nullable=True)
    deliverable_metadata = Column("metadata", JSON, nullable=False, default=dict)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
