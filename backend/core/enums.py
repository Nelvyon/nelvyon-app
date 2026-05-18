"""
Core enums for NELVYON Backend.
Centralized enum definitions used across the application.
"""

from enum import Enum


class Environment(str, Enum):
    """Application environment."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TEST = "test"


class SubscriptionPlan(str, Enum):
    """Subscription plan tiers."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    PARTNER = "partner"


class BillingCycle(str, Enum):
    """Billing cycle options."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMIANNUAL = "semiannual"
    ANNUAL = "annual"
    BIENNIAL = "biennial"


class DealStage(str, Enum):
    """Pipeline deal stages."""
    LEAD = "lead"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class TicketStatus(str, Enum):
    """Helpdesk ticket statuses."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    """Helpdesk ticket priorities."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ContractStatus(str, Enum):
    """Contract statuses."""
    DRAFT = "draft"
    SENT = "sent"
    SIGNED = "signed"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class AuditSeverity(str, Enum):
    """Audit log severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class UserRole(str, Enum):
    """User roles for RBAC."""
    USER = "user"
    EDITOR = "editor"
    MANAGER = "manager"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"