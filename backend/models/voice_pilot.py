"""VOZ NELVYON v2 pilot — workspace voice inbound metadata and monthly usage."""

from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint


class Voice_pilot_inbound(Base):
    __tablename__ = "voice_pilot_inbound"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, nullable=False, index=True)
    ticket_id = Column(Integer, nullable=False, index=True)
    storage_key = Column(String(64), nullable=False, unique=True, index=True)
    content_type = Column(String(128), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Voice_pilot_usage(Base):
    __tablename__ = "voice_pilot_usage"
    __table_args__ = (
        UniqueConstraint("workspace_id", "period_yyyymm", name="uq_voice_pilot_usage_ws_period"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, nullable=False, index=True)
    period_yyyymm = Column(Integer, nullable=False)
    inbound_count = Column(Integer, nullable=False, default=0)
    synth_count = Column(Integer, nullable=False, default=0)
