# BACKUP-1 FASE 1 — Backup y restauracion minima

Esta fase deja un flujo manual, ejecutable y verificable para respaldo de base de datos.

## Alcance de esta fase

- Backup manual con timestamp.
- Restore manual en base de datos de prueba.
- Soporte para:
  - SQLite (`sqlite+aiosqlite:///...`)
  - PostgreSQL (`postgresql+asyncpg://...`)

Script principal: `backend/scripts/db_backup_restore.py`

## 1) Crear backup

### PowerShell

```powershell
cd "C:\Users\Asus\Downloads\app_v181\backend"
python scripts\db_backup_restore.py backup --database-url "sqlite+aiosqlite:///./nelvyon_local.db" --output-dir "..\backups"
```

### Bash

```bash
cd /ruta/app_v181/backend
python scripts/db_backup_restore.py backup --database-url "sqlite+aiosqlite:///./nelvyon_local.db" --output-dir "../backups"
```

Salida esperada:

```text
BACKUP_OK <ruta-al-backup>
```

## 2) Restaurar en base de datos de prueba

### PowerShell

```powershell
cd "C:\Users\Asus\Downloads\app_v181\backend"
python scripts\db_backup_restore.py restore --backup-file "..\backups\db_backup_YYYYMMDD_HHMMSS.sqlite3" --target-database-url "sqlite+aiosqlite:///./restore_test.db" --overwrite
```

### Bash

```bash
cd /ruta/app_v181/backend
python scripts/db_backup_restore.py restore --backup-file "../backups/db_backup_YYYYMMDD_HHMMSS.sqlite3" --target-database-url "sqlite+aiosqlite:///./restore_test.db" --overwrite
```

Salida esperada:

```text
RESTORE_OK <ruta-o-objeto-restaurado>
```

## 3) Nota PostgreSQL (FASE 1)

- El script usa `pg_dump` para backup y `pg_restore` para restore.
- Deben existir en `PATH`.
- El restore se aplica sobre la DB destino indicada por `--target-database-url`.
- En esta fase no se crea infraestructura cloud ni scheduler.

## 4) Validacion automatizada de backup/restore (SQLite)

```bash
cd backend
python -m pytest tests/test_backup_phase1.py -q --tb=short
```

Este test:

1. crea una SQLite temporal con una tabla y dato de ejemplo,
2. ejecuta backup con el script,
3. restaura en otra SQLite temporal,
4. verifica lectura del dato restaurado.
