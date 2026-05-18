from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Nelvyon_user_settings(Base):
    __tablename__ = "nelvyon_user_settings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    display_name = Column(String, nullable=True)
    role = Column(String, nullable=True)
    two_fa_enabled = Column(Boolean, nullable=True)
    notification_new_clients = Column(Boolean, nullable=True)
    notification_qa_complete = Column(Boolean, nullable=True)
    notification_deploys = Column(Boolean, nullable=True)
    notification_errors = Column(Boolean, nullable=True)
    notification_weekly_email = Column(Boolean, nullable=True)
    theme_id = Column(String, nullable=True)
    custom_theme_json = Column(String, nullable=True)