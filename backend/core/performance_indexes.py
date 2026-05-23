"""Apply idempotent performance indexes at startup."""

from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import text

from core.database import db_manager

logger = logging.getLogger(__name__)

_SQL_PATH = Path(__file__).resolve().parent.parent / "migrations" / "performance_indexes.sql"


async def ensure_performance_indexes() -> None:
    if not _SQL_PATH.is_file():
        logger.warning("performance_indexes.sql not found at %s", _SQL_PATH)
        return

    sql = _SQL_PATH.read_text(encoding="utf-8")
    statements = [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
    if not statements:
        return

    if db_manager.engine is None:
        await db_manager.ensure_initialized()
    if db_manager.engine is None:
        logger.warning("Database engine unavailable — skipping performance indexes")
        return

    engine = db_manager.engine
    applied = 0
    async with engine.begin() as conn:
        for stmt in statements:
            try:
                await conn.execute(text(stmt))
                applied += 1
            except Exception as exc:
                logger.debug("Index statement skipped: %s — %s", stmt[:80], exc)

    logger.info("Performance indexes ensured (%s statements)", applied)
