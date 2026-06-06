"""OS deliverable client portal reviews (migration 320)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Integer, String, Text

from core.database import Base


class Os_deliverable_reviews(Base):
    __tablename__ = "os_deliverable_reviews"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    deliverable_id = Column(String(36), nullable=False, index=True)
    portal_user_id = Column(String(36), nullable=False, index=True)
    decision = Column(String, nullable=False)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
