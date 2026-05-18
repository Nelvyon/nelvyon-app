from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Nelvyon_products(Base):
    __tablename__ = "nelvyon_products"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=False)
    client_id = Column(Integer, nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    benefits = Column(String, nullable=True)
    specs = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    category = Column(String, nullable=True)
    images = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)