from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Helpdesk_tickets(Base):
    __tablename__ = "helpdesk_tickets"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=False, index=True)
    subject = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    category = Column(String, nullable=True)
    assigned_to = Column(String, nullable=True)
    client_name = Column(String, nullable=True)
    client_email = Column(String, nullable=True)
    channel = Column(String, nullable=True)
    resolution_notes = Column(String, nullable=True)
    satisfaction_score = Column(Integer, nullable=True)
    first_response_minutes = Column(Integer, nullable=True)
    # E2E relationship fields
    client_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=True, index=True)
    output_id = Column(Integer, nullable=True, index=True)
    contract_id = Column(Integer, nullable=True, index=True)
    social_post_id = Column(Integer, nullable=True, index=True)
    campaign_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)