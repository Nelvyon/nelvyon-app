from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Conversations(Base):
    __tablename__ = "conversations"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    contact_id = Column(Integer, nullable=True)
    contact_name = Column(String, nullable=False)
    channel = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    last_message = Column(String, nullable=True)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=True)
    unread_count = Column(Integer, nullable=True)
    priority = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)