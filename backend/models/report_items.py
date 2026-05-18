from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Report_items(Base):
    __tablename__ = "report_items"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    name = Column(String, nullable=False)
    report_type = Column(String, nullable=True)
    status = Column(String, nullable=True)
    data_json = Column(String, nullable=True)
    metrics_json = Column(String, nullable=True)
    period = Column(String, nullable=True)
    generated_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)