from core.database import Base
from sqlalchemy import Column, Integer, String


class Automation_jobs(Base):
    __tablename__ = "automation_jobs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    client_id = Column(Integer, nullable=True)
    client_name = Column(String, nullable=True)
    job_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    input_data = Column(String, nullable=True)
    output_data = Column(String, nullable=True)
    output_id = Column(Integer, nullable=True)
    project_id = Column(Integer, nullable=True)
    source = Column(String, nullable=True)
    webhook_id = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    delivered_at = Column(String, nullable=True)
    created_at = Column(String, nullable=True)