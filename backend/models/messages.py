from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Messages(Base):
    __tablename__ = "messages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    conversation_id = Column(Integer, nullable=False)
    sender_type = Column(String, nullable=True)
    sender_name = Column(String, nullable=True)
    content = Column(String, nullable=False)
    channel = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)