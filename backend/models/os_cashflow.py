from core.database import Base
from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text


class Os_cashflow(Base):
    __tablename__ = "os_cashflow"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    direction = Column(String, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String, nullable=False, default="EUR")
    flow_date = Column(String, nullable=True)
    source_type = Column(String, nullable=False, default="manual")
    source_id = Column(Integer, nullable=True)
    category = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
