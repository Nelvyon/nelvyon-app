from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Nelvyon_assets(Base):
    __tablename__ = "nelvyon_assets"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    client_id = Column(Integer, nullable=False)
    asset_type = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    object_key = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    classification = Column(String, nullable=True)
    dimensions = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    visibility = Column(String, nullable=True)
    # E2E relationship fields
    project_id = Column(Integer, nullable=True, index=True)
    output_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=True)