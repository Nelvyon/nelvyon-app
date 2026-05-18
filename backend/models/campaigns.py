from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Campaigns(Base):
    __tablename__ = "campaigns"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    content = Column(String, nullable=True)
    recipients_count = Column(Integer, nullable=True)
    sent_count = Column(Integer, nullable=True)
    open_count = Column(Integer, nullable=True)
    click_count = Column(Integer, nullable=True)
    reply_count = Column(Integer, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    # E2E relationship fields
    contact_id = Column(Integer, nullable=True, index=True)
    deal_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=True, index=True)
    client_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=True)