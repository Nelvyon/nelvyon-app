from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Contract_logs(Base):
    __tablename__ = "contract_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    contract_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    field_changed = Column(String, nullable=True)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    actor_name = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)