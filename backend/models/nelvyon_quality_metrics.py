from core.database import Base
from sqlalchemy import Boolean, Column, Float, Integer, String


class Nelvyon_quality_metrics(Base):
    __tablename__ = "nelvyon_quality_metrics"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    service_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    service_name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    score = Column(Integer, nullable=True)
    has_backend = Column(Boolean, nullable=True)
    has_ai = Column(Boolean, nullable=True)
    has_crud = Column(Boolean, nullable=True)
    has_real_data = Column(Boolean, nullable=True)
    uptime = Column(Float, nullable=True)
    response_time = Column(Integer, nullable=True)
    description = Column(String, nullable=True)
    real_features = Column(String, nullable=True)
    limitations = Column(String, nullable=True)
    route = Column(String, nullable=True)
    last_checked = Column(String, nullable=True)