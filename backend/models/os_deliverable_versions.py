"""OS deliverable version snapshots (migration 321)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from core.database import Base


class Os_deliverable_versions(Base):
    __tablename__ = "os_deliverable_versions"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    deliverable_id = Column(String(36), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    status = Column(String, nullable=False)
    file_url = Column(String, nullable=True)
    review_notes = Column(Text, nullable=True)
    version_metadata = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=True)
