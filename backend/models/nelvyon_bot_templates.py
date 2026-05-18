from core.database import Base
from sqlalchemy import Boolean, Column, Float, Integer, String


class Nelvyon_bot_templates(Base):
    __tablename__ = "nelvyon_bot_templates"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    template_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=True)
    channels = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    uses = Column(Integer, nullable=True)
    icon_name = Column(String, nullable=True)
    color = Column(String, nullable=True)
    features = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)