from core.database import Base
from sqlalchemy import Column, Integer, String


class Nelvyon_clients(Base):
    __tablename__ = "nelvyon_clients"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    business_name = Column(String, nullable=False)
    sector = Column(String, nullable=False)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    ideal_customer = Column(String, nullable=True)
    value_proposition = Column(String, nullable=True)
    differentiator = Column(String, nullable=True)
    services = Column(String, nullable=True)
    objectives = Column(String, nullable=True)
    brand_tone = Column(String, nullable=True)
    visual_style = Column(String, nullable=True)
    brand_colors = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    competition = Column(String, nullable=True)
    testimonials = Column(String, nullable=True)
    case_studies = Column(String, nullable=True)
    budget = Column(String, nullable=True)
    language = Column(String, nullable=True)
    market = Column(String, nullable=True)
    website_url = Column(String, nullable=True)