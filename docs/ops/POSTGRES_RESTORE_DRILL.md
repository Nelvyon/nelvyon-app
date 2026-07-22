# Postgres restore drill

## Evidence

- Script: `scripts/run-postgres-restore-drill.mjs`  
- Latest evidence JSON: `docs/evidence/os-saas-e2e/postgres_restore_drill_latest.json`  
- Backup workflow: `.github/workflows/db-backup.yml` (needs `DATABASE_PUBLIC_URL`, not `railway.internal`)

## Procedure (ops)

1. Ensure backup artifact available.  
2. Run drill against **non-prod** restore target.  
3. Record JSON evidence path + timestamp in HANDOVER if material.  
4. CEO: first scheduled `Database Backup` workflow run if never executed.

## Not done by this agent

- Production destructive restore  
- Creating paid backup vendors
