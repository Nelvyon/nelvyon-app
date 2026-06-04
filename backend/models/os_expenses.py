from core.database import Base
from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text


class Os_expenses(Base):
    __tablename__ = "os_expenses"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String, nullable=False, default="EUR")
    status = Column(String, nullable=False, default="pendiente")
    category = Column(String, nullable=True)
    vendor = Column(String, nullable=True)
    expense_date = Column(String, nullable=True)
    paid_at = Column(String, nullable=True)
    client_id = Column(Integer, nullable=True)
    project_id = Column(Integer, nullable=True)
    assignee = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
