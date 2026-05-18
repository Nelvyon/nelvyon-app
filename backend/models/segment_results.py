from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Segment_results(Base):
    __tablename__ = "segment_results"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    total_contacts = Column(Integer, nullable=True)
    segments_count = Column(Integer, nullable=True)
    top_segment = Column(String, nullable=True)
    data_quality_score = Column(Integer, nullable=True)
    result_json = Column(String, nullable=True)
    contacts_json = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)