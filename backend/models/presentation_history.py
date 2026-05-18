from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Presentation_history(Base):
    __tablename__ = "presentation_history"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    pres_type = Column(String, nullable=True)
    client_name = Column(String, nullable=True)
    client_sector = Column(String, nullable=True)
    slides_count = Column(Integer, nullable=True)
    language = Column(String, nullable=True)
    slides_json = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)