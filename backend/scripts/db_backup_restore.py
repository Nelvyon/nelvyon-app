#!/usr/bin/env python3
"""
BACKUP-1 FASE 1
CLI minima para backup/restauracion de base de datos.

Soporta:
- SQLite: copia consistente via sqlite3 backup API.
- PostgreSQL: dump custom con pg_dump y restore con pg_restore.
"""

from __future__ import annotations

import argparse
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Literal

from sqlalchemy.engine import URL, make_url


DBKind = Literal["sqlite", "postgresql"]


def _now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _detect_kind(url: URL) -> DBKind:
    driver = (url.drivername or "").lower()
    if "sqlite" in driver:
        return "sqlite"
    if "postgresql" in driver or "postgres" in driver:
        return "postgresql"
    raise ValueError(f"Motor no soportado en FASE 1: {url.drivername}")


def _to_sync_postgres_url(url: URL) -> str:
    # pg_dump/pg_restore trabajan con DSN sync, no asyncpg.
    driver = (url.drivername or "").lower()
    if "+asyncpg" in driver:
        url = url.set(drivername="postgresql")
    return url.render_as_string(hide_password=False)


def _resolve_sqlite_file(url: URL) -> Path:
    db_name = url.database
    if not db_name:
        raise ValueError("SQLite URL sin fichero de base de datos.")
    db_path = Path(db_name)
    if not db_path.is_absolute():
        db_path = Path.cwd() / db_path
    return db_path


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def create_backup(database_url: str, output_dir: Path) -> Path:
    url = make_url(database_url)
    kind = _detect_kind(url)
    output_dir.mkdir(parents=True, exist_ok=True)

    if kind == "sqlite":
        source = _resolve_sqlite_file(url)
        if not source.exists():
            raise FileNotFoundError(f"No existe SQLite origen: {source}")
        backup_file = output_dir / f"db_backup_{_now_stamp()}.sqlite3"
        _ensure_parent(backup_file)
        with sqlite3.connect(source) as src_conn, sqlite3.connect(backup_file) as dst_conn:
            src_conn.backup(dst_conn)
        return backup_file

    if shutil.which("pg_dump") is None:
        raise RuntimeError("pg_dump no encontrado en PATH.")
    backup_file = output_dir / f"db_backup_{_now_stamp()}.dump"
    cmd = [
        "pg_dump",
        "--format=custom",
        "--file",
        str(backup_file),
        "--dbname",
        _to_sync_postgres_url(url),
    ]
    subprocess.run(cmd, check=True)
    return backup_file


def restore_backup(backup_file: Path, target_database_url: str, overwrite: bool) -> Path:
    if not backup_file.exists():
        raise FileNotFoundError(f"Backup no encontrado: {backup_file}")

    url = make_url(target_database_url)
    kind = _detect_kind(url)

    if kind == "sqlite":
        target = _resolve_sqlite_file(url)
        _ensure_parent(target)
        if target.exists() and not overwrite:
            raise FileExistsError(
                f"La BD destino ya existe: {target}. Usa --overwrite para reemplazar."
            )
        shutil.copy2(backup_file, target)
        return target

    if shutil.which("pg_restore") is None:
        raise RuntimeError("pg_restore no encontrado en PATH.")
    cmd = [
        "pg_restore",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--dbname",
        _to_sync_postgres_url(url),
        str(backup_file),
    ]
    subprocess.run(cmd, check=True)
    return backup_file


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Backup/restore DB (FASE 1)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_backup = sub.add_parser("backup", help="Crear backup con timestamp")
    p_backup.add_argument("--database-url", required=True, help="DATABASE_URL origen")
    p_backup.add_argument(
        "--output-dir",
        default=str(_project_root() / "backups"),
        help="Directorio de backups (default: ./backups)",
    )

    p_restore = sub.add_parser("restore", help="Restaurar backup en DB de prueba")
    p_restore.add_argument("--backup-file", required=True, help="Fichero backup origen")
    p_restore.add_argument(
        "--target-database-url",
        required=True,
        help="DATABASE_URL destino (debe ser entorno de prueba)",
    )
    p_restore.add_argument(
        "--overwrite",
        action="store_true",
        help="Permite sobrescribir SQLite destino existente",
    )
    return parser


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    try:
        if args.command == "backup":
            backup_path = create_backup(
                database_url=args.database_url,
                output_dir=Path(args.output_dir),
            )
            print(f"BACKUP_OK {backup_path}")
            return 0

        restored = restore_backup(
            backup_file=Path(args.backup_file),
            target_database_url=args.target_database_url,
            overwrite=bool(args.overwrite),
        )
        print(f"RESTORE_OK {restored}")
        return 0
    except Exception as exc:
        print(f"ERROR {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
