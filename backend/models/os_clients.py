"""NELVYON OS canonical clients (migration 315)."""
from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from core.database import Base


class Os_clients(Base):
    __tablename__ = "os_clients"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    created_by_user_id = Column(String, nullable=False)
    business_name = Column(String, nullable=False)
    sector = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    contact_email = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    ideal_customer = Column(Text, nullable=True)
    value_proposition = Column(Text, nullable=True)
    differentiator = Column(Text, nullable=True)
    services = Column(Text, nullable=True)
    objectives = Column(Text, nullable=True)
    brand_tone = Column(String, nullable=True)
    visual_style = Column(String, nullable=True)
    brand_colors = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    competition = Column(Text, nullable=True)
    testimonials = Column(Text, nullable=True)
    case_studies = Column(Text, nullable=True)
    budget = Column(String, nullable=True)
    language = Column(String, nullable=True)
    market = Column(String, nullable=True)
    client_metadata = Column("metadata", JSON, nullable=False, default=dict)
    legacy_nelvyon_client_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
