"""Progreso del wizard de onboarding por workspace/usuario/paso."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UniqueConstraint, func

from core.database import Base


class Onboarding_progress(Base):
    __tablename__ = "onboarding_progress"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "user_id",
            "step_key",
            name="uq_onboarding_progress_ws_user_step",
        ),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    user_id = Column(String, nullable=False)
    step_key = Column(String, nullable=False)
    completed = Column(Boolean, nullable=True, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    data_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
