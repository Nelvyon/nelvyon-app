#!/usr/bin/env python3
"""
Prepare staging DB for NELVYON panel flows A–D (cliente, campaña, ticket, lead).

Run on Railway (Root Directory = backend/):
  python scripts/prepare_staging.py

Requires DATABASE_URL (postgresql+asyncpg://…). Loads apps/web/.env.staging.local when
MIGRATE_ENV=staging (default).
"""
from __future__ import annotations

import json
import os
import ssl
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import asyncpg

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from db.load_env_files import load_env_files, normalize_async_database_url  # noqa: E402

ALEMBIC_HEAD = "pr04_oauth_tokens"

CORE_TABLES = ("workspaces", "workspace_members", "subscriptions", "alembic_version")
ABCD_TABLES = ("nelvyon_clients", "nelvyon_campaigns", "helpdesk_tickets")
ABCD_WORKSPACE_COLUMNS = ABCD_TABLES


def pg_url() -> str:
    raw = os.environ.get("DATABASE_URL", "").strip()
    if not raw:
        raise RuntimeError("DATABASE_URL missing")
    return raw.replace("postgresql+asyncpg://", "postgresql://")


def _ssl_for_url(url: str):
    if "supabase" in url or "pooler.supabase.com" in url:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    return "require"


async def connect() -> asyncpg.Connection:
    return await asyncpg.connect(pg_url(), ssl=_ssl_for_url(pg_url()))


async def table_exists(conn: asyncpg.Connection, name: str) -> bool:
    reg = await conn.fetchval("SELECT to_regclass($1::text)", f"public.{name}")
    return reg is not None


async def column_exists(conn: asyncpg.Connection, table: str, column: str) -> bool:
    return bool(
        await conn.fetchval(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
            """,
            table,
            column,
        )
    )


async def is_node_subscriptions(conn: asyncpg.Connection) -> bool:
    if not await table_exists(conn, "subscriptions"):
        return False
    if await column_exists(conn, "subscriptions", "plan_id"):
        return False
    return await column_exists(conn, "subscriptions", "plan")


async def pre_alembic_hybrid_fix(conn: asyncpg.Connection) -> list[str]:
    actions: list[str] = []

    if await is_node_subscriptions(conn):
        n = await conn.fetchval("SELECT COUNT(*)::int FROM subscriptions")
        if n == 0:
            await conn.execute("ALTER TABLE subscriptions RENAME TO subscriptions_node_paddle")
            actions.append("renamed empty Node subscriptions → subscriptions_node_paddle")
        else:
            raise RuntimeError(
                f"Node subscriptions has {n} rows; cannot auto-migrate without manual merge"
            )

    if not await table_exists(conn, "workspaces"):
        await conn.execute(
            """
            CREATE TABLE workspaces (
              id SERIAL PRIMARY KEY,
              user_id VARCHAR NOT NULL,
              name VARCHAR NOT NULL,
              slug VARCHAR,
              logo_url VARCHAR,
              primary_color VARCHAR,
              domain VARCHAR,
              plan VARCHAR,
              status VARCHAR,
              created_at TIMESTAMPTZ
            )
            """
        )
        await conn.execute("CREATE INDEX IF NOT EXISTS ix_workspaces_id ON workspaces (id)")
        actions.append("created workspaces")

    if not await table_exists(conn, "workspace_members"):
        await conn.execute(
            """
            CREATE TABLE workspace_members (
              id SERIAL PRIMARY KEY,
              workspace_id INTEGER NOT NULL,
              user_id VARCHAR NOT NULL,
              email VARCHAR,
              role VARCHAR NOT NULL,
              status VARCHAR NOT NULL,
              invited_by VARCHAR,
              joined_at VARCHAR,
              created_at VARCHAR
            )
            """
        )
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS ix_workspace_members_id ON workspace_members (id)"
        )
        actions.append("created workspace_members")

    if not await table_exists(conn, "subscriptions"):
        await conn.execute(
            """
            CREATE TABLE subscriptions (
              id SERIAL PRIMARY KEY,
              user_id VARCHAR NOT NULL,
              plan_id VARCHAR NOT NULL,
              billing_cycle VARCHAR NOT NULL,
              status VARCHAR NOT NULL,
              stripe_session_id VARCHAR,
              stripe_subscription_id VARCHAR,
              amount_paid DOUBLE PRECISION,
              currency VARCHAR,
              promo_code VARCHAR,
              started_at TIMESTAMPTZ,
              expires_at TIMESTAMPTZ,
              created_at TIMESTAMPTZ,
              updated_at TIMESTAMPTZ,
              workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
              stripe_customer_id VARCHAR,
              current_period_start TIMESTAMPTZ,
              current_period_end TIMESTAMPTZ
            )
            """
        )
        await conn.execute("CREATE INDEX IF NOT EXISTS ix_subscriptions_id ON subscriptions (id)")
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS ix_subscriptions_workspace_id ON subscriptions (workspace_id)"
        )
        await conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_stripe_subscription_id_nonnull
            ON subscriptions (stripe_subscription_id)
            WHERE stripe_subscription_id IS NOT NULL
            """
        )
        actions.append("created Python subscriptions (plan_id + workspace_id)")

    if not await table_exists(conn, "stripe_webhook_events"):
        await conn.execute(
            """
            CREATE TABLE stripe_webhook_events (
              id SERIAL PRIMARY KEY,
              stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
              event_type VARCHAR(128) NOT NULL,
              status VARCHAR(32) NOT NULL DEFAULT 'received',
              received_at TIMESTAMPTZ,
              processed_at TIMESTAMPTZ,
              error_message TEXT
            )
            """
        )
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS ix_stripe_webhook_events_stripe_event_id "
            "ON stripe_webhook_events (stripe_event_id)"
        )
        actions.append("created stripe_webhook_events")

    if not await table_exists(conn, "oauth_tokens"):
        await conn.execute(
            """
            CREATE TABLE oauth_tokens (
              id SERIAL PRIMARY KEY,
              workspace_id INTEGER NOT NULL,
              user_id VARCHAR NOT NULL,
              provider VARCHAR NOT NULL,
              access_token TEXT,
              refresh_token TEXT,
              token_type VARCHAR,
              expires_at TIMESTAMPTZ,
              scopes_json TEXT,
              account_name VARCHAR,
              account_id VARCHAR,
              extra_json TEXT,
              connected_at TIMESTAMPTZ,
              last_sync_at TIMESTAMPTZ,
              error TEXT,
              UNIQUE (workspace_id, user_id, provider)
            )
            """
        )
        actions.append("created oauth_tokens")

    return actions


async def inspect_db(conn: asyncpg.Connection) -> dict[str, Any]:
    tables = list(CORE_TABLES) + list(ABCD_TABLES) + [
        "subscriptions_node_paddle",
        "stripe_webhook_events",
        "oauth_tokens",
        "nelvyon_users",
    ]
    out: dict[str, Any] = {"tables": {}, "alembic_version": None, "subscriptions": {}}

    for t in tables:
        out["tables"][t] = await table_exists(conn, t)

    if out["tables"].get("alembic_version"):
        row = await conn.fetchrow("SELECT version_num FROM alembic_version LIMIT 1")
        out["alembic_version"] = row["version_num"] if row else None

    if out["tables"].get("subscriptions"):
        cols = await conn.fetch(
            """
            SELECT column_name, is_nullable, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'subscriptions'
            ORDER BY ordinal_position
            """
        )
        out["subscriptions"]["columns"] = [dict(r) for r in cols]
        out["subscriptions"]["has_plan_id"] = any(
            c["column_name"] == "plan_id" for c in cols
        )
        out["subscriptions"]["row_count"] = await conn.fetchval(
            "SELECT COUNT(*)::int FROM subscriptions"
        )

    if out["tables"].get("workspaces"):
        out["workspaces_count"] = await conn.fetchval("SELECT COUNT(*)::int FROM workspaces")
    if out["tables"].get("workspace_members"):
        out["workspace_members_count"] = await conn.fetchval(
            "SELECT COUNT(*)::int FROM workspace_members"
        )

    out["abcd_workspace_id"] = {}
    for t in ABCD_WORKSPACE_COLUMNS:
        if out["tables"].get(t):
            out["abcd_workspace_id"][t] = await column_exists(conn, t, "workspace_id")

    for t in ABCD_TABLES:
        if out["tables"].get(t):
            out.setdefault("abcd_row_counts", {})[t] = await conn.fetchval(
                f"SELECT COUNT(*)::int FROM {t}"
            )

    return out


async def seed_default_workspaces(conn: asyncpg.Connection) -> list[str]:
    """Create Mi Workspace + owner member for each nelvyon_users row without a workspace."""
    if not await table_exists(conn, "nelvyon_users"):
        return ["skipped seed: nelvyon_users missing"]

    actions: list[str] = []
    users = await conn.fetch(
        """
        SELECT user_id::text AS user_id, email, COALESCE(plan, 'starter') AS plan
        FROM nelvyon_users
        WHERE deleted_at IS NULL
        ORDER BY created_at ASC NULLS LAST
        """
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    for u in users:
        uid = u["user_id"]
        existing = await conn.fetchval(
            "SELECT id FROM workspaces WHERE user_id = $1 ORDER BY id ASC LIMIT 1",
            uid,
        )
        if existing:
            continue

        ws_id = await conn.fetchval(
            """
            INSERT INTO workspaces (user_id, name, slug, status, plan, created_at)
            VALUES ($1, 'Mi Workspace', 'default', 'active', $2, NOW())
            RETURNING id
            """,
            uid,
            u["plan"] or "starter",
        )

        has_member = await conn.fetchval(
            """
            SELECT 1 FROM workspace_members
            WHERE workspace_id = $1 AND user_id = $2
            LIMIT 1
            """,
            ws_id,
            uid,
        )
        if not has_member:
            await conn.execute(
                """
                INSERT INTO workspace_members
                  (workspace_id, user_id, email, role, status, joined_at, created_at)
                VALUES ($1, $2, $3, 'owner', 'active', $4, $4)
                """,
                ws_id,
                uid,
                u["email"],
                now_iso,
            )

        actions.append(f"workspace id={ws_id} for {u['email']}")

    return actions


async def rerun_saas_bridge_backfill(conn: asyncpg.Connection) -> None:
    if not await table_exists(conn, "workspaces") or not await table_exists(conn, "saas_tenants"):
        return
    await conn.execute(
        """
        UPDATE saas_tenants st
        SET workspace_id = sub.wid, updated_at = NOW()
        FROM (
          SELECT st2.id AS tenant_pk,
            (SELECT w.id FROM public.workspaces w
             WHERE w.user_id = st2.user_id::text
             ORDER BY w.id ASC LIMIT 1) AS wid
          FROM saas_tenants st2
          WHERE st2.workspace_id IS NULL
        ) sub
        WHERE st.id = sub.tenant_pk
          AND sub.wid IS NOT NULL
          AND st.workspace_id IS NULL
        """
    )


def run_alembic(*args: str) -> tuple[bool, str]:
    env = os.environ.copy()
    env.setdefault("MIGRATE_ENV", "staging")
    env.setdefault("NELVYON_ENV", "staging")
    load_env_files()
    db_url = normalize_async_database_url(os.environ.get("DATABASE_URL", ""))
    if not db_url:
        return False, "DATABASE_URL empty"
    env["DATABASE_URL"] = db_url
    proc = subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    out = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()
    return proc.returncode == 0, out


def _schema_ok(after: dict[str, Any], alembic_ok: bool) -> tuple[bool, list[str]]:
    issues: list[str] = []
    for t in CORE_TABLES:
        if t == "alembic_version":
            continue
        if not after["tables"].get(t):
            issues.append(f"missing table: {t}")

    for t in ABCD_TABLES:
        if not after["tables"].get(t):
            issues.append(f"missing table: {t}")
        elif not after.get("abcd_workspace_id", {}).get(t):
            issues.append(f"missing column: {t}.workspace_id")

    if after.get("alembic_version") != ALEMBIC_HEAD:
        issues.append(f"alembic_version != {ALEMBIC_HEAD} ({after.get('alembic_version')})")

    if not alembic_ok:
        issues.append("alembic upgrade failed")

    subs = after.get("subscriptions", {})
    if after["tables"].get("subscriptions") and not subs.get("has_plan_id"):
        issues.append("subscriptions missing plan_id (Node schema?)")

    return len(issues) == 0, issues


def _print_summary(report: dict[str, Any]) -> None:
    print("\n=== prepare_staging summary ===")
    if report.get("pre_actions"):
        print("Pre-alembic:", ", ".join(report["pre_actions"]))
    if report.get("seed_actions"):
        print("Workspaces seeded:", len(report["seed_actions"]))
        for line in report["seed_actions"][:10]:
            print(f"  • {line}")
        if len(report["seed_actions"]) > 10:
            print(f"  … +{len(report['seed_actions']) - 10} more")
    after = report.get("after") or {}
    print(f"Alembic head: {after.get('alembic_version')} (expected {ALEMBIC_HEAD})")
    print(f"workspaces: {after.get('workspaces_count', '?')} rows")
    print(f"workspace_members: {after.get('workspace_members_count', '?')} rows")
    for t in ABCD_TABLES:
        exists = after.get("tables", {}).get(t)
        count = after.get("abcd_row_counts", {}).get(t, "?")
        ws_col = after.get("abcd_workspace_id", {}).get(t)
        print(f"{t}: {'OK' if exists else 'MISSING'} rows={count} workspace_id={'yes' if ws_col else 'no'}")
    if report.get("schema_issues"):
        print("ISSUES:")
        for i in report["schema_issues"]:
            print(f"  ✗ {i}")
    else:
        print("Schema checks: OK")
    print(f"Exit: {'READY' if report.get('functional_deploy_ready') else 'NOT READY'}")
    print("===============================\n")


async def main() -> int:
    os.environ.setdefault("MIGRATE_ENV", "staging")
    os.environ.setdefault("NELVYON_ENV", "staging")
    load_env_files()

    report: dict[str, Any] = {
        "pre_actions": [],
        "seed_actions": [],
        "alembic_ok": False,
        "alembic_output": "",
        "before": None,
        "after": None,
        "schema_issues": [],
        "functional_deploy_ready": False,
    }

    conn = await connect()
    try:
        report["before"] = await inspect_db(conn)
        report["pre_actions"] = await pre_alembic_hybrid_fix(conn)
    finally:
        await conn.close()

    ok_upgrade, out_upgrade = run_alembic("upgrade", "head")
    if not ok_upgrade:
        ok_stamp, out_stamp = run_alembic("stamp", ALEMBIC_HEAD)
        report["alembic_stamp_fallback"] = {"ok": ok_stamp, "output": out_stamp[-2000:]}
        if ok_stamp:
            ok_verify, out_verify = run_alembic("upgrade", "head")
            report["alembic_ok"] = ok_verify
            report["alembic_output"] = (
                f"[upgrade failed, stamped head]\n{out_upgrade[-3000:]}\n\n[verify]\n{out_verify}"
            )
        else:
            report["alembic_ok"] = False
            report["alembic_output"] = out_upgrade
            print(json.dumps(report, indent=2))
            _print_summary(report)
            return 1
    else:
        report["alembic_ok"] = True
        report["alembic_output"] = out_upgrade[-4000:]

    conn = await connect()
    try:
        report["seed_actions"] = await seed_default_workspaces(conn)
        await rerun_saas_bridge_backfill(conn)
        report["after"] = await inspect_db(conn)
    finally:
        await conn.close()

    ok, issues = _schema_ok(report["after"], report["alembic_ok"])
    report["schema_issues"] = issues
    report["functional_deploy_ready"] = ok

    print(json.dumps(report, indent=2))
    _print_summary(report)
    return 0 if ok else 1


if __name__ == "__main__":
    import asyncio

    raise SystemExit(asyncio.run(main()))
