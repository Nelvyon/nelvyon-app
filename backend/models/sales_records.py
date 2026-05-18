from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Sales_records(Base):
    __tablename__ = "sales_records"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    client_name = Column(String, nullable=False)
    product = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=True)
    status = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)