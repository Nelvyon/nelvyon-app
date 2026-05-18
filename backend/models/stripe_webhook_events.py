from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Text, UniqueConstraint


class StripeWebhookEvent(Base):
    """Stores processed Stripe webhook event ids for idempotency (event.id UNIQUE)."""

    __tablename__ = "stripe_webhook_events"
    __table_args__ = (
        UniqueConstraint("stripe_event_id", name="uq_stripe_webhook_events_event_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    stripe_event_id = Column(String(255), nullable=False, index=True)
    event_type = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="received")
    received_at = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
