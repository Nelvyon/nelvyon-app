from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Nelvyon_campaigns(Base):
    __tablename__ = "nelvyon_campaigns"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=False)
    client_id = Column(Integer, nullable=True)
    platform = Column(String, nullable=False)
    campaign_type = Column(String, nullable=False)
    name = Column(String, nullable=True)
    content = Column(String, nullable=True)
    variants_count = Column(Integer, nullable=True)
    budget_suggested = Column(Float, nullable=True)
    target_audience = Column(String, nullable=True)
    qa_score = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)