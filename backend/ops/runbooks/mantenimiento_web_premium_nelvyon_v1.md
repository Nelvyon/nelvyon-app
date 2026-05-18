# NELVYON Premium OS Standards — Mantenimiento web v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

Mantenimiento web Premium OS Standards for NELVYON v1 (client delivery checklist — **paperwork layer only**)

## Purpose

This **Mantenimiento web Premium** template is **OS-facing delivery paperwork**: statuses, evidence, **type badges** (actualizaciones, backups, seguridad, rendimiento, uptime, seo_tecnico, soporte, reporting), and links — it does **not** wire real uptime probes, backup jobs, or external monitoring APIs from this surface.

Suggested touchpoints for honest verification (expectations vs product):

- `/os/observability` — dashboards, SLOs, and ownership  
- `/os/observability/incidents` — incident response posture  
- `/os/web-premium/preview` — when CWV and front-end maintenance overlap paperwork  
- `/help` — SLA disputes, security disclosure, or data retention escalations  

---

## Scope (minimum real)

- **Delivery discipline:** Baseline audit, change windows, rollback, and communication plan documented before client sign-off.
- **Honesty:** Backup RPO/RTO and test restore cadence explicit — no “daily backup” without restore proof story.
- **Performance:** CWV targets and measurement source agreed — template does not run Lighthouse from OS.

---

## Limits (explicit non-goals)

- No live monitoring, synthetic checks, or pager integrations from this OS template.
- No third-party backup, CDN, or WAF API calls from this preview.
- Does not modify closed product fronts; does not open `/crm/deals`.

---

## Premium checklist (web maintenance delivery)

| Area | Premium expectation |
| --- | --- |
| READY | Golden path / `pnpm gate` discipline when maintenance-related surfaces ship in the same release train. |
| INITIAL AUDIT | Stack, dependencies, risk register, and access model documented. |
| UPDATES & PATCHES | Cadence, testing gates, and emergency patch path explicit. |
| BACKUPS & RECOVERY | Scope, encryption, retention, and restore drill schedule honest. |
| SECURITY & HARDENING | Headers, TLS, dependency alerts, and vuln SLAs described — no auto-scan claims from OS alone. |
| PERFORMANCE & CWV | Budgets, regressions checks, and third-party script policy explicit. |
| UPTIME & MONITORING | SLO, alert routes, and on-call — align with `/os/observability`. |
| MONTHLY REPORTING | Incidents, changes, metrics — definitions limited to what was actually measured. |

---

## Mini X‑EXEC

1. Open `/os/mantenimiento-web-premium/preview` and walk deliverables for the demo project.  
2. Open `/os/observability` and `/os/observability/incidents` to contrast paperwork vs ops routes.  
3. Skim `/help` when SLAs or security incidents are in scope.  
4. Run golden path (`/os/excellence/golden-path`) before closing the checklist.
