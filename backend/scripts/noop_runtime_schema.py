"""One-shot: replace runtime ensure_schema DDL with no-ops (migration 507 owns schema)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP = {"tests", "alembic", "scripts", "__pycache__"}

NOOP_STATIC = '''
    @staticmethod
    async def ensure_schema(*_args, **_kwargs) -> None:
        """Schema owned by backend/db/migrations — no runtime DDL."""
        return
'''

NOOP_CLASS = '''
    @classmethod
    async def ensure_schema(cls, *_args, **_kwargs) -> None:
        """Schema owned by backend/db/migrations — no runtime DDL."""
        return
'''

NOOP_INSTANCE = '''
    async def ensure_schema(self, *_args, **_kwargs) -> None:
        """Schema owned by backend/db/migrations — no runtime DDL."""
        return
'''

NOOP_UNDERSCORE = '''
    async def _ensure_schema(self, *_args, **_kwargs) -> None:
        """Schema owned by backend/db/migrations — no runtime DDL."""
        return
'''

PATTERNS = [
    (re.compile(r"(\s+)@staticmethod\s+async def ensure_schema\([^)]*\)[^:]*:.*?(?=\n\s+(?:@|async def |def |class ))", re.S), NOOP_STATIC),
    (re.compile(r"(\s+)@classmethod\s+async def ensure_schema\([^)]*\)[^:]*:.*?(?=\n\s+(?:@|async def |def |class ))", re.S), NOOP_CLASS),
    (re.compile(r"(\s+)async def _ensure_schema\([^)]*\)[^:]*:.*?(?=\n\s+(?:async def |def |class ))", re.S), NOOP_UNDERSCORE),
    (re.compile(r"(\s+)async def ensure_schema\([^)]*\)[^:]*:.*?(?=\n\s+(?:async def |def |class |@))", re.S), NOOP_INSTANCE),
]


def should_scan(path: Path) -> bool:
    parts = set(path.parts)
    if parts & SKIP:
        return False
    return path.suffix == ".py" and "CREATE TABLE IF NOT EXISTS" in path.read_text(encoding="utf-8", errors="ignore")


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    for pattern, replacement in PATTERNS:
        text = pattern.sub(replacement, text)
    # Router-level helpers
    text = re.sub(
        r"async def _ensure_permissions_table\([^)]*\)[^:]*:.*?(?=\n\nasync def |\n\n@|\nclass |\Z)",
        'async def _ensure_permissions_table(db):  # noqa: ARG001\n    """Schema owned by migration 507 — no runtime DDL."""\n    return\n',
        text,
        flags=re.S,
    )
    text = re.sub(
        r"async def _ensure_branding_activation_log_table\([^)]*\)[^:]*:.*?(?=\n\nasync def |\n\n@|\nclass |\Z)",
        'async def _ensure_branding_activation_log_table(db):  # noqa: ARG001\n    """Schema owned by migration 507 — no runtime DDL."""\n    return\n',
        text,
        flags=re.S,
    )
    text = re.sub(
        r"async def _ensure_advisor_usage_table\([^)]*\)[^:]*:.*?(?=\n\nasync def |\n\n@|\ndef _|\Z)",
        'async def _ensure_advisor_usage_table(db):  # noqa: ARG001\n    """Schema owned by migration 507 — no runtime DDL."""\n    return\n',
        text,
        flags=re.S,
    )
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed: list[str] = []
    for path in ROOT.rglob("*.py"):
        if not should_scan(path) and "ensure_schema" not in path.read_text(encoding="utf-8", errors="ignore"):
            continue
        if "ensure_schema" in path.read_text(encoding="utf-8", errors="ignore") or "CREATE TABLE IF NOT EXISTS" in path.read_text(encoding="utf-8", errors="ignore"):
            if path.name == "noop_runtime_schema.py":
                continue
            if patch_file(path):
                changed.append(str(path.relative_to(ROOT)))
    # os_global inline CREATE in route handler
    og = ROOT / "routers" / "os_global.py"
    if og.exists():
        t = og.read_text(encoding="utf-8")
        t2 = re.sub(
            r"\n\s+await db\.execute\(\s*text\(\s*\"\"\"\s*CREATE TABLE IF NOT EXISTS tenant_branding_activation_logs.*?\"\"\"\s*\)\s*\)\s*\n\s+await db\.commit\(\)\s*\n",
            "\n    # tenant_branding_activation_logs: migration 507\n",
            t,
            flags=re.S,
        )
        if t2 != t:
            og.write_text(t2, encoding="utf-8")
            changed.append("routers/os_global.py")
    print(f"Patched {len(changed)} files:")
    for c in sorted(changed):
        print(f"  - {c}")


if __name__ == "__main__":
    main()
