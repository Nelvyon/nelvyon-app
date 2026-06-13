"""Load repo/web env files for CLI tools (migrate, alembic, staging prep)."""
from __future__ import annotations

import os
from pathlib import Path


def load_env_files() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    web_root = repo_root / "apps" / "web"
    staging = (os.environ.get("MIGRATE_ENV") or os.environ.get("NELVYON_ENV") or "").lower() == "staging"
    files = [
        *( [web_root / ".env.staging.local"] if staging else [] ),
        web_root / ".env.production.local",
        web_root / ".env.production.local.txt",
        web_root / ".env.local",
        repo_root / ".env.production",
        repo_root / ".env",
    ]
    for file in files:
        if not file.is_file():
            continue
        for line in file.read_text(encoding="utf-8").splitlines():
            trimmed = line.strip()
            if not trimmed or trimmed.startswith("#"):
                continue
            eq = trimmed.find("=")
            if eq <= 0:
                continue
            key = trimmed[:eq].strip()
            val = trimmed[eq + 1 :].strip()
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            if not os.environ.get(key):
                os.environ[key] = val


def normalize_async_database_url(raw_url: str) -> str:
    url = raw_url.strip()
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://") :]
    return url
