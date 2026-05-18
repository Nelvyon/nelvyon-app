from core.database import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String


class Subscriptions(Base):
    """Subscription billing row; titular is workspace_id.

    user_id: audit trail for who created / initiated checkout (not the billing titular).
    expires_at: legacy end date from the pre-Stripe-period calculation; when migrating,
    current_period_end is the canonical period end from Stripe once integrated.
    """

    __tablename__ = "subscriptions"
    __table_args__ = (
        Index("ix_subscriptions_workspace_id", "workspace_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    workspace_id = Column(
        Integer,
        ForeignKey("workspaces.id", ondelete="RESTRICT"),
        nullable=False,
    )
    plan_id = Column(String, nullable=False)
    billing_cycle = Column(String, nullable=False)
    status = Column(String, nullable=False)
    stripe_session_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    amount_paid = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    promo_code = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
