from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Boolean, func


class WorkflowRules(Base):
    __tablename__ = "workflow_rules"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    trigger_type = Column(String, nullable=False)
    trigger_config = Column(String, nullable=True)
    action_type = Column(String, nullable=False)
    action_config = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    runs_count = Column(Integer, default=0, nullable=False)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WorkflowExecutions(Base):
    __tablename__ = "workflow_executions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    rule_id = Column(Integer, nullable=False)
    rule_name = Column(String, nullable=True)
    trigger_type = Column(String, nullable=False)
    trigger_data = Column(String, nullable=True)
    action_type = Column(String, nullable=False)
    action_result = Column(String, nullable=True)
    status = Column(String, nullable=False, default="success")
    error_message = Column(String, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())


class EmailQueue(Base):
    __tablename__ = "email_queue"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(Integer, nullable=True, index=True)
    to_email = Column(String, nullable=False)
    to_name = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    body_html = Column(String, nullable=True)
    body_text = Column(String, nullable=True)
    email_type = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    error_message = Column(String, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())