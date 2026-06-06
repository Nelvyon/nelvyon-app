"""OS portal client users (migration 319)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Integer, String

from core.database import Base


class Os_portal_users(Base):
    __tablename__ = "os_portal_users"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    client_id = Column(String(36), nullable=False, index=True)
    email = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    invite_id = Column(String(36), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
