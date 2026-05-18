"""Tokens OAuth por workspace/usuario (router `oauth_integrations`)."""

from sqlalchemy import Column, DateTime, Integer, String, Text, UniqueConstraint

from core.database import Base


class Oauth_tokens(Base):
    __tablename__ = "oauth_tokens"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", "provider", name="uq_oauth_tokens_ws_user_provider"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    workspace_id = Column(Integer, nullable=False)
    user_id = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_type = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    scopes_json = Column(Text, nullable=True)
    account_name = Column(String, nullable=True)
    account_id = Column(String, nullable=True)
    extra_json = Column(Text, nullable=True)
    connected_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(Text, nullable=True)
