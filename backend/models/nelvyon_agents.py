from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Nelvyon_agents(Base):
    __tablename__ = "nelvyon_agents"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    agent_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    codename = Column(String, nullable=True)
    description = Column(String, nullable=True)
    long_description = Column(String, nullable=True)
    color = Column(String, nullable=True)
    gradient = Column(String, nullable=True)
    icon_name = Column(String, nullable=True)
    status = Column(String, nullable=True)
    uptime = Column(String, nullable=True)
    tasks_completed = Column(Integer, nullable=True)
    tasks_today = Column(Integer, nullable=True)
    success_rate = Column(Float, nullable=True)
    functionality_level = Column(String, nullable=True)
    functionality_note = Column(String, nullable=True)
    capabilities = Column(String, nullable=True)
    metrics = Column(String, nullable=True)
    recent_tasks = Column(String, nullable=True)
    logs = Column(String, nullable=True)