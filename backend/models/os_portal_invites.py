"""OS portal client invites (migration 319)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Integer, String

from core.database import Base


class Os_portal_invites(Base):
    __tablename__ = "os_portal_invites"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    client_id = Column(String(36), nullable=False, index=True)
    email = Column(String, nullable=False)
    token_hash = Column(String, nullable=False, unique=True)
    role = Column(String, nullable=False, default="viewer")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_by_user_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=True)
