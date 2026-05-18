"""
Staging Environment Configuration — NELVYON OS.

Provides environment-specific settings for staging deployment.
Staging mirrors production but with:
- Debug logging enabled
- Swagger docs accessible
- Relaxed rate limits for QA testing
- Test payment mode (Stripe test keys)
- Separate database instance

Usage:
    ENVIRONMENT=staging python -m uvicorn main:app

Environment variables for staging:
    ENVIRONMENT=staging
    DATABASE_URL=postgresql+asyncpg://user:pass@staging-db:5432/nelvyon_staging
    REDIS_URL=redis://staging-redis:6379/0
    JWT_SECRET_KEY=staging-secret-key
    STRIPE_SECRET_KEY=sk_test_...  (test mode)
    SENDGRID_API_KEY=SG...
"""
import logging
import os
from typing import Any, Dict

logger = logging.getLogger(__name__)

# Staging-specific configuration overrides
STAGING_CONFIG: Dict[str, Any] = {
    # Logging
    "log_level": "DEBUG",
    "log_format": "%(asctime)s [STAGING] %(name)s %(levelname)s %(message)s",

    # API Documentation (enabled in staging)
    "docs_enabled": True,

    # Rate limits (relaxed for QA)
    "rate_limit_multiplier": 3,  # 3x normal limits

    # CORS (allow staging domains)
    "cors_origins": [
        r"https?://(.*\.)?nelvyon\.(com|dev|app)(:\d+)?$",
        r"https?://staging\.(.*\.)?nelvyon\.(com|dev|app)(:\d+)?$",
        r"https?://localhost(:\d+)?$",
    ],

    # Database
    "db_pool_size": 5,
    "db_max_overflow": 10,

    # Features
    "enable_mock_data": True,
    "enable_debug_endpoints": True,

    # Payments
    "stripe_mode": "test",

    # Email
    "email_sandbox": True,  # Don't send real emails
}


def get_staging_config() -> Dict[str, Any]:
    """Get staging configuration with environment variable overrides."""
    config = STAGING_CONFIG.copy()

    # Allow env var overrides
    if os.environ.get("STAGING_LOG_LEVEL"):
        config["log_level"] = os.environ["STAGING_LOG_LEVEL"]
    if os.environ.get("STAGING_EMAIL_SANDBOX") == "false":
        config["email_sandbox"] = False

    return config


def is_staging() -> bool:
    """Check if current environment is staging."""
    return os.environ.get("ENVIRONMENT", "").lower() == "staging"


def apply_staging_overrides():
    """Apply staging-specific configuration overrides at startup."""
    if not is_staging():
        return

    config = get_staging_config()
    logger.info("=" * 60)
    logger.info("🟡 STAGING ENVIRONMENT ACTIVE")
    logger.info("=" * 60)
    logger.info(f"  Log level: {config['log_level']}")
    logger.info(f"  Docs enabled: {config['docs_enabled']}")
    logger.info(f"  Rate limit multiplier: {config['rate_limit_multiplier']}x")
    logger.info(f"  Email sandbox: {config['email_sandbox']}")
    logger.info(f"  Stripe mode: {config['stripe_mode']}")
    logger.info("=" * 60)

    # Set log level
    logging.getLogger().setLevel(getattr(logging, config["log_level"]))