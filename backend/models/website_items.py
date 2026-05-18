from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Website_items(Base):
    __tablename__ = "website_items"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=True)
    template = Column(String, nullable=True)
    status = Column(String, nullable=True)
    pages_count = Column(Integer, nullable=True)
    visits = Column(Integer, nullable=True)
    ssl_enabled = Column(Boolean, nullable=True)
    seo_score = Column(Integer, nullable=True)
    performance_score = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)