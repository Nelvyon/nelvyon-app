from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Website_pages(Base):
    __tablename__ = "website_pages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    website_id = Column(Integer, nullable=False)
    page_name = Column(String, nullable=False)
    slug = Column(String, nullable=True)
    sections_json = Column(String, nullable=True)
    seo_title = Column(String, nullable=True)
    seo_description = Column(String, nullable=True)
    seo_keywords = Column(String, nullable=True)
    is_published = Column(Boolean, nullable=True)
    sort_order = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)