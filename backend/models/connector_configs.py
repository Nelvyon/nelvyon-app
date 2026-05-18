from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Connector_configs(Base):
    __tablename__ = "connector_configs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    connector_name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    status = Column(String, nullable=True)
    config_json = Column(String, nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(String, nullable=True)
    events_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)