"""SQLite-compatible schemas for HTTP integration tests (Frente 48)."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

INTEGRATION_TABLES: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS crm_contacts (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        score INTEGER NOT NULL DEFAULT 0,
        tags TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_deals (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        contact_id TEXT NOT NULL,
        title TEXT NOT NULL,
        value REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'EUR',
        stage TEXT NOT NULL DEFAULT 'lead',
        probability INTEGER NOT NULL DEFAULT 10,
        close_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS crm_activities (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        contact_id TEXT NOT NULL,
        deal_id TEXT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        outcome TEXT,
        scheduled_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        slug TEXT UNIQUE,
        kind TEXT NOT NULL DEFAULT 'form',
        fields TEXT NOT NULL DEFAULT '[]',
        settings TEXT NOT NULL DEFAULT '{}',
        embed_token TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        views_count INTEGER NOT NULL DEFAULT 0,
        submissions_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS form_responses (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL,
        workspace_id INTEGER NOT NULL,
        responses TEXT NOT NULL DEFAULT '{}',
        visitor_info TEXT NOT NULL DEFAULT '{}',
        completion_seconds INTEGER,
        submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS chatbots (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        avatar_url TEXT,
        color_primario TEXT DEFAULT '#6366f1',
        mensaje_bienvenida TEXT DEFAULT '',
        idioma TEXT DEFAULT 'es',
        comportamiento TEXT DEFAULT 'soporte',
        base_conocimiento TEXT DEFAULT '',
        escalada_a_humano INTEGER DEFAULT 1,
        embed_token TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id TEXT PRIMARY KEY,
        chatbot_id TEXT NOT NULL,
        workspace_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        visitor_info TEXT DEFAULT '{}',
        messages TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS webinars (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        slug TEXT,
        status TEXT DEFAULT 'draft',
        scheduled_at TEXT,
        duration_minutes INTEGER DEFAULT 60,
        host_name TEXT DEFAULT '',
        thumbnail_url TEXT,
        is_free INTEGER DEFAULT 1,
        price_cents INTEGER DEFAULT 0,
        max_attendees INTEGER,
        idioma TEXT DEFAULT 'es',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS webinar_registrations (
        id TEXT PRIMARY KEY,
        webinar_id TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT DEFAULT '',
        status TEXT DEFAULT 'registered',
        registered_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS landing_pages (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        slug TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        blocks TEXT NOT NULL DEFAULT '[]',
        meta TEXT NOT NULL DEFAULT '{}',
        form_fields TEXT NOT NULL DEFAULT '[]',
        custom_domain TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS os_store_projects (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        subdomain TEXT UNIQUE,
        store_info TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        pages_count INTEGER NOT NULL DEFAULT 0,
        currency TEXT DEFAULT 'EUR',
        country_code TEXT DEFAULT 'ES',
        custom_domain TEXT,
        domain_verified INTEGER DEFAULT 0,
        seo_artifacts TEXT NOT NULL DEFAULT '{}',
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS os_store_pages (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        workspace_id INTEGER NOT NULL,
        page_type TEXT NOT NULL,
        page_slug TEXT NOT NULL,
        landing_page_id TEXT,
        order_index INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
)


async def bootstrap_integration_schemas(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        for ddl in INTEGRATION_TABLES:
            await conn.execute(text(ddl.strip()))


def migrations_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "migrations"
