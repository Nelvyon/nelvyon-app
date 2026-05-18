from core.database import Base
from sqlalchemy import Column, Integer, String


class Workspace_members(Base):
    __tablename__ = "workspace_members"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    user_id = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, nullable=False)
    status = Column(String, nullable=False)
    invited_by = Column(String, nullable=True)
    joined_at = Column(String, nullable=True)
    created_at = Column(String, nullable=True)