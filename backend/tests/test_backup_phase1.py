"""
BACKUP-1 FASE 1 — validacion minima de backup/restauracion SQLite.

No toca la BD real del proyecto: usa rutas temporales por test.
"""

from __future__ import annotations

import sqlite3
import subprocess
import sys
from pathlib import Path


def _sqlite_url(db_file: Path) -> str:
    # SQLAlchemy URL cross-platform para ruta absoluta.
    return f"sqlite+aiosqlite:///{db_file.as_posix()}"


def test_backup_and_restore_sqlite_roundtrip(tmp_path: Path):
    src_db = tmp_path / "src.db"
    restore_db = tmp_path / "restored.db"
    backup_dir = tmp_path / "backups"

    with sqlite3.connect(src_db) as conn:
        conn.execute("CREATE TABLE sample (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")
        conn.execute("INSERT INTO sample (name) VALUES ('nelvyon')")
        conn.commit()

    script = Path(__file__).resolve().parents[1] / "scripts" / "db_backup_restore.py"

    backup_cmd = [
        sys.executable,
        str(script),
        "backup",
        "--database-url",
        _sqlite_url(src_db),
        "--output-dir",
        str(backup_dir),
    ]
    backup_run = subprocess.run(backup_cmd, capture_output=True, text=True, check=True)
    assert "BACKUP_OK" in backup_run.stdout

    backup_files = sorted(backup_dir.glob("db_backup_*.sqlite3"))
    assert backup_files, "No se genero fichero backup sqlite"
    backup_file = backup_files[-1]

    restore_cmd = [
        sys.executable,
        str(script),
        "restore",
        "--backup-file",
        str(backup_file),
        "--target-database-url",
        _sqlite_url(restore_db),
        "--overwrite",
    ]
    restore_run = subprocess.run(restore_cmd, capture_output=True, text=True, check=True)
    assert "RESTORE_OK" in restore_run.stdout
    assert restore_db.exists()

    with sqlite3.connect(restore_db) as conn:
        row = conn.execute("SELECT name FROM sample LIMIT 1").fetchone()
    assert row is not None
    assert row[0] == "nelvyon"
