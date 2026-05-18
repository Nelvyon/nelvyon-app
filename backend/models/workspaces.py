from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Text


class Workspaces(Base):
    __tablename__ = "workspaces"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    primary_color = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    plan = Column(String, nullable=True)
    status = Column(String, nullable=True)
    # Tenant extension (tenant_management router + Alembic en prod); nullable para compatibilidad
    timezone = Column(String, nullable=True)
    locale = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    billing_email = Column(String, nullable=True)
    max_users = Column(Integer, nullable=True)
    features_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)