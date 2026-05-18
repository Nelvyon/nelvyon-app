from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Nelvyon_outputs(Base):
    __tablename__ = "nelvyon_outputs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=False)
    client_id = Column(Integer, nullable=True)
    output_type = Column(String, nullable=False)
    title = Column(String, nullable=True)
    content = Column(String, nullable=True)
    qa_score = Column(Integer, nullable=True)
    qa_status = Column(String, nullable=True)
    qa_feedback = Column(String, nullable=True)
    qa_attempts = Column(Integer, nullable=True)
    version = Column(Integer, nullable=True)
    extra_data = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)