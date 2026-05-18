from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Blog_posts(Base):
    __tablename__ = "blog_posts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, nullable=True)
    content = Column(String, nullable=True)
    excerpt = Column(String, nullable=True)
    category = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    status = Column(String, nullable=True)
    author = Column(String, nullable=True)
    featured_image = Column(String, nullable=True)
    seo_title = Column(String, nullable=True)
    seo_description = Column(String, nullable=True)
    views_count = Column(Integer, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)