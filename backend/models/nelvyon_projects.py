from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Nelvyon_projects(Base):
    __tablename__ = "nelvyon_projects"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    client_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    project_type = Column(String, nullable=False)
    status = Column(String, nullable=True)
    progress = Column(Integer, nullable=True)
    brief = Column(String, nullable=True)
    deliverables = Column(String, nullable=True)
    deadline = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)