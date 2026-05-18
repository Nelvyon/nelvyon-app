"""
Test configuration and fixtures for NELVYON backend tests.

Uses SQLite in-memory for fast, isolated test execution.
No external services required.
"""
import asyncio
import gc
import os
import sys
import time
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure backend is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment BEFORE importing app
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///test.db"
# Job queue: tests must use in-process AsyncJobQueue (ARQ+Redis would leave jobs pending without a broker worker).
os.environ.pop("REDIS_URL", None)
os.environ["JWT_SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["JWT_EXPIRE_MINUTES"] = "60"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["ADMIN_EMAIL"] = "admin@test.com"
os.environ["ADMIN_PASSWORD"] = "TestPassword123!"
# Billing PR#2: at least one Stripe Price ID for tests that hit create_payment_session
os.environ.setdefault("STRIPE_PRICE_STARTER_MONTHLY", "price_test_starter_monthly")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_fake_not_for_production")
# Fase 4: muchos tests crean workspaces efímeros; 10 es bajo y rompe la suite completa por orden acumulativo.
os.environ.setdefault("NELVYON_TEST_MAX_WORKSPACES_PER_USER", "64")
# OAuth oleada 3: authorize URL tests (sin secret real en CI)
os.environ.setdefault("META_CLIENT_ID", "test_meta_client_id")
os.environ.setdefault("META_CLIENT_SECRET", "test_meta_client_secret")


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create test database engine with SQLite."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///test.db",
        echo=False,
    )
    yield engine
    await engine.dispose()
    # Cleanup test database (Windows puede retener el handle un instante)
    if os.path.exists("test.db"):
        for _ in range(5):
            try:
                os.remove("test.db")
                break
            except PermissionError:
                gc.collect()
                time.sleep(0.05)
            except OSError:
                break


@pytest_asyncio.fixture(scope="session")
async def setup_database(test_engine):
    """Create all tables in test database and seed workspaces for tenant HTTP tests."""
    from sqlalchemy import text

    from core.database import Base

    import models.stripe_webhook_events  # noqa: F401 — register StripeWebhookEvent in metadata
    import models.security_events  # noqa: F401 — audit table for AUDIT-RBAC-1 tests
    import models.workspace_members  # noqa: F401 — FK graph for workspaces
    import models.workspaces  # noqa: F401 — seed INSERT below requires this table in metadata
    import models.subscriptions  # noqa: F401 — plan_quota / remediation tests (subscriptions)
    import models.oauth_tokens  # noqa: F401 — oauth_integrations HTTP tests
    import models.onboarding_progress  # noqa: F401 — onboarding router tests
    import models.nelvyon_clients  # noqa: F401 — orchestrator / OS entity tests
    import models.nelvyon_projects  # noqa: F401
    import models.nelvyon_outputs  # noqa: F401
    import models.contacts  # noqa: F401 — e2e_orchestrator / CRM chain tests
    import models.contracts  # noqa: F401
    import models.deals  # noqa: F401
    import models.social_posts  # noqa: F401
    import models.helpdesk_tickets  # noqa: F401
    import models.voice_pilot  # noqa: F401 — VOZ v2 pilot tables
    import models.workflow_rules  # noqa: F401 — EmailQueue for transactional email tests
    import models.campaigns  # noqa: F401
    import models.nelvyon_assets  # noqa: F401
    import models.automation_jobs  # noqa: F401 — automation pipeline + Oleada 6 HTTP tests
    import models.automation_webhooks  # noqa: F401
    import models.partner_records  # noqa: F401 — PII entity Oleada 6
    import models.sales_records  # noqa: F401
    import models.user_roles  # noqa: F401 — platform admin Oleada 6
    import models.platform_metrics  # noqa: F401 — platform-only metrics Oleada 8
    import models.auth  # noqa: F401 — users table (perfil JWT Oleada 7)
    import models.nelvyon_user_settings  # noqa: F401 — platform_settings Oleada 7
    import models.blog_posts  # noqa: F401 — Oleada 9 ws/op verified
    import models.report_items  # noqa: F401 — Oleada 9 ws/op verified
    import models.segment_results  # noqa: F401 — Oleada 9 ws/op verified

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Aligns with JWT subs in auth_headers / admin_headers (require_workspace + membership)
        await conn.execute(
            text(
                """
                INSERT OR IGNORE INTO workspaces (id, user_id, name, slug, status)
                VALUES
                (1, 'test-user-00000000-0000-0000-0000-000000000001', 'Test Workspace', 'test-ws', 'active'),
                (2, 'admin-user-00000000-0000-0000-0000-000000000001', 'Admin Workspace', 'admin-ws', 'active')
                """
            )
        )
        # ENTERPRISE-READY-1 RBAC: member de workspace 1 (sin permiso de mutación SaaS)
        await conn.execute(
            text(
                """
                INSERT OR IGNORE INTO workspace_members
                (workspace_id, user_id, email, role, status)
                VALUES
                (1, 'member-user-00000000-0000-0000-0000-000000000099', 'member@test.com', 'member', 'active')
                """
            )
        )
        await conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, name, role)
                VALUES
                ('test-user-00000000-0000-0000-0000-000000000001', 'testuser@nelvyon-test.com', 'Test User', 'user'),
                ('member-user-00000000-0000-0000-0000-000000000099', 'member@test.com', 'Member User', 'user'),
                ('admin-user-00000000-0000-0000-0000-000000000001', 'admin@nelvyon-test.com', 'Admin User', 'admin'),
                ('super-admin-00000000-0000-0000-0000-000000000001', 'superadmin@nelvyon-test.com', 'Super Admin', 'super_admin')
                """
            )
        )
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(test_engine, setup_database) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional database session for each test."""
    session_maker = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_maker() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(setup_database) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP client for API testing."""
    from main import app

    # httpx ASGITransport no ejecuta el lifespan de FastAPI: arrancar job queue aquí
    # (en prod/staging lo hace main.lifespan).
    from core.job_queue import AsyncJobQueue, job_queue
    from core.nelvyon_job_handlers import register_nelvyon_job_handlers

    if isinstance(job_queue, AsyncJobQueue):
        try:
            if getattr(job_queue, "_running", False):
                await job_queue.stop()
        except RuntimeError:
            pass
        job_queue.reset_for_new_event_loop()
    register_nelvyon_job_handlers()
    await job_queue.start()

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        await job_queue.stop()


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """
    Generate a valid JWT Bearer token for test authentication.

    Creates a token directly using core.auth.create_access_token
    with claims matching what get_current_user expects (sub, email, name, role).
    """
    from core.auth import create_access_token

    token = create_access_token({
        "sub": "test-user-00000000-0000-0000-0000-000000000001",
        "email": "testuser@nelvyon-test.com",
        "name": "Test User",
        "role": "user",
    })
    return {
        "Authorization": f"Bearer {token}",
        "X-Workspace-Id": "1",
    }


@pytest_asyncio.fixture
async def member_headers(client: AsyncClient) -> dict:
    """Usuario member del workspace 1 (rol workspace: member → sin CUD operativo)."""
    from core.auth import create_access_token

    token = create_access_token({
        "sub": "member-user-00000000-0000-0000-0000-000000000099",
        "email": "member@test.com",
        "name": "Member User",
        "role": "user",
    })
    return {
        "Authorization": f"Bearer {token}",
        "X-Workspace-Id": "1",
    }


@pytest_asyncio.fixture
async def super_admin_headers(client: AsyncClient) -> dict:
    """JWT super_admin — para GET /all y rutas de plataforma que exigen super_admin."""
    from core.auth import create_access_token

    token = create_access_token({
        "sub": "super-admin-00000000-0000-0000-0000-000000000001",
        "email": "superadmin@nelvyon-test.com",
        "name": "Super Admin",
        "role": "super_admin",
    })
    return {
        "Authorization": f"Bearer {token}",
        "X-Workspace-Id": "1",
    }


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient) -> dict:
    """
    Generate a valid JWT Bearer token with admin role for test authentication.
    """
    from core.auth import create_access_token

    token = create_access_token({
        "sub": "admin-user-00000000-0000-0000-0000-000000000001",
        "email": "admin@nelvyon-test.com",
        "name": "Admin User",
        "role": "admin",
    })
    return {
        "Authorization": f"Bearer {token}",
        "X-Workspace-Id": "2",
    }


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "smoke_abcd: REGRESSION-ABCD-1 — contratos HTTP mínimos A/B/C/D (staging)",
    )