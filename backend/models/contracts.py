from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Contracts(Base):
    __tablename__ = "contracts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True)
    title = Column(String, nullable=False)
    contract_type = Column(String, nullable=True)
    client_name = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    content = Column(String, nullable=True)
    jurisdiction = Column(String, nullable=True)
    language = Column(String, nullable=True)
    status = Column(String, nullable=True)
    signature_data = Column(String, nullable=True)
    price = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    template_id = Column(String, nullable=True)
    audit_trail = Column(String, nullable=True)
    # E2E relationship fields
    client_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=True, index=True)
    output_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)