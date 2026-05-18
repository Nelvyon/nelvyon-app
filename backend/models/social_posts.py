from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Social_posts(Base):
    __tablename__ = "social_posts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    content = Column(String, nullable=False)
    format_type = Column(String, nullable=True)
    status = Column(String, nullable=False)
    scheduled_at = Column(String, nullable=True)
    published_at = Column(String, nullable=True)
    impressions = Column(Integer, nullable=True)
    clicks = Column(Integer, nullable=True)
    likes = Column(Integer, nullable=True)
    comments = Column(Integer, nullable=True)
    shares = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, nullable=True)
    hashtags = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    campaign_name = Column(String, nullable=True)
    # E2E relationship fields
    client_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=True, index=True)
    output_id = Column(Integer, nullable=True, index=True)
    contract_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=True)