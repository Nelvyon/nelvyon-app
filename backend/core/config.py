import logging
import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from db.load_env_files import load_env_files

logger = logging.getLogger(__name__)

# Populate os.environ from repo/web .env files before Settings() is instantiated.
load_env_files()


class Settings(BaseSettings):
    # Application
    app_name: str = "NELVYON OS API"
    debug: bool = False
    version: str = "2.0.0"
    environment: str = Field(default="development", validation_alias="ENVIRONMENT")
    log_format: str = Field(default="", validation_alias="LOG_FORMAT")
    super_admin_user_ids: str = Field(default="", validation_alias="SUPER_ADMIN_USER_IDS")
    allow_admin_bootstrap: bool = Field(default=False, validation_alias="ALLOW_ADMIN_BOOTSTRAP")
    frontend_app_url: str = Field(default="", validation_alias="FRONTEND_APP_URL")

    # Server
    host: str = Field(default="0.0.0.0", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")

    # Database
    database_url: str = Field(default="", validation_alias="DATABASE_URL")

    # Cache / queue
    redis_url: str = Field(default="", validation_alias="REDIS_URL")

    # Auth / JWT (Next.js uses JWT_SECRET; legacy Python paths use JWT_SECRET_KEY)
    jwt_secret: str = Field(default="", validation_alias="JWT_SECRET")
    jwt_secret_key: str = Field(default="", validation_alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=60, validation_alias="JWT_EXPIRE_MINUTES")

    # Admin bootstrap (local dev)
    admin_email: str = Field(default="", validation_alias="ADMIN_EMAIL")
    admin_password: str = Field(default="", validation_alias="ADMIN_PASSWORD")
    admin_user_id: str = Field(default="", validation_alias="ADMIN_USER_ID")
    admin_user_email: str = Field(default="", validation_alias="ADMIN_USER_EMAIL")

    # Stripe
    stripe_secret_key: str = Field(default="", validation_alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", validation_alias="STRIPE_WEBHOOK_SECRET")

    # OIDC (optional — enterprise SSO)
    oidc_issuer_url: str = Field(default="", validation_alias="OIDC_ISSUER_URL")
    oidc_client_id: str = Field(default="", validation_alias="OIDC_CLIENT_ID")
    oidc_client_secret: str = Field(default="", validation_alias="OIDC_CLIENT_SECRET")
    oidc_scope: str = Field(default="openid profile email", validation_alias="OIDC_SCOPE")

    # AI providers
    app_ai_base_url: str = Field(default="", validation_alias="APP_AI_BASE_URL")
    app_ai_key: str = Field(default="", validation_alias="APP_AI_KEY")
    openai_api_key: str = Field(default="", validation_alias="OPENAI_API_KEY")

    # Object storage (optional)
    oss_service_url: str = Field(default="", validation_alias="OSS_SERVICE_URL")
    oss_api_key: str = Field(default="", validation_alias="OSS_API_KEY")

    # Frontend origin (legacy FRONTEND_URL; prefer FRONTEND_APP_URL / NEXT_PUBLIC_APP_URL)
    frontend_url: str = Field(default="", validation_alias="FRONTEND_URL")

    # Observability
    sentry_dsn: str = Field(default="", validation_alias="SENTRY_DSN")

    # AWS Lambda
    is_lambda: bool = Field(default=False, validation_alias="IS_LAMBDA")
    lambda_function_name: str = Field(default="fastapi-backend", validation_alias="LAMBDA_FUNCTION_NAME")
    aws_region: str = Field(default="us-east-1", validation_alias="AWS_REGION")

    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    @property
    def backend_url(self) -> str:
        if self.is_lambda:
            return os.environ.get(
                "PYTHON_BACKEND_URL",
                f"https://{self.lambda_function_name}.execute-api.{self.aws_region}.amazonaws.com",
            )
        display_host = "127.0.0.1" if self.host == "0.0.0.0" else self.host
        return os.environ.get("PYTHON_BACKEND_URL", f"http://{display_host}:{self.port}")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @property
    def effective_jwt_secret(self) -> str:
        return self.jwt_secret.strip() or self.jwt_secret_key.strip()

    @property
    def effective_frontend_url(self) -> str:
        return (
            self.frontend_url.strip()
            or self.frontend_app_url.strip()
            or os.environ.get("NEXT_PUBLIC_APP_URL", "").strip()
        )


settings = Settings()
