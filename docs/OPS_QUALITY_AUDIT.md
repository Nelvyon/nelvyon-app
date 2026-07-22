# OPS QUALITY AUDIT — 2026-07-22 (refresh cierre)

## P0 / P1

| ID | Severity | Status |
|----|----------|--------|
| DNS `app.nelvyon.com` | P0 | **Open** NXDOMAIN · CNAME humano |
| `STAGING_QA_PASSWORD` | P1 | **Open** · no está en `gh secret list` |
| Prod health | OK | live/ready 200 · SHA `06690725a67d` |
| IA flags | OK OFF | ABSENT Railway |
| Local Router default | Fixed | ADR-037 fail-closed |

## Crons
`cronAuth.ts` timing-safe · fail-closed sin `CRON_SECRET` — **OK**

## Backups / restore
Workflow `db-backup.yml` · drill `docs/ops/POSTGRES_RESTORE_DRILL.md` · evidence JSON existe · CEO primer run pendiente

## Compliance campañas
`docs/COMPLIANCE_COMPANY_DB_CHECKLIST.md` · **no** dictamen legal · bloqueo envío masivo
