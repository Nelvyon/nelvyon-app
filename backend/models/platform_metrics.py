from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Platform_metrics(Base):
    __tablename__ = "platform_metrics"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    metric_type = Column(String, nullable=False)
    module_name = Column(String, nullable=False)
    endpoint = Column(String, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True)
    is_ai = Column(Boolean, nullable=True)
    extra_data = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)