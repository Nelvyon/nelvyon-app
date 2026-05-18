from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Workflows(Base):
    __tablename__ = "workflows"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    trigger_type = Column(String, nullable=False)
    nodes_json = Column(String, nullable=True)
    status = Column(String, nullable=True)
    runs_count = Column(Integer, nullable=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)