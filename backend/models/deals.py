from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String, Index


class Deals(Base):
    __tablename__ = "deals"
    # `deals` pasa a crearla `create_all` desde la migracion 532, que aparto la
    # tabla legacy `tenant_id`. El indice del filtro de inquilino va aqui porque
    # 531 no puede crearlo: al migrar desde cero la tabla aun no existe.
    __table_args__ = (
        Index("ix_deals_workspace_id", "workspace_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    contact_id = Column(Integer, nullable=True)
    title = Column(String, nullable=False)
    value = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    stage = Column(String, nullable=False)
    pipeline = Column(String, nullable=True)
    probability = Column(Integer, nullable=True)
    expected_close = Column(DateTime(timezone=True), nullable=True)
    assigned_to = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    days_in_stage = Column(Integer, nullable=True)
    # E2E relationship fields
    client_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=True, index=True)
    campaign_id = Column(Integer, nullable=True, index=True)
    contract_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)