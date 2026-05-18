# NELVYON Premium OS Standards — Consultoría de automatización v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

Consultoría de automatización Premium OS Standards for NELVYON v1 (client delivery checklist — **paperwork layer only**)

## Purpose

This **Consultoría automatización Premium** template is **OS-facing delivery paperwork**: statuses, evidence, **type badges** (workflow, webhook, crm_automation, email_sequence, lead_scoring, reporting_auto, integration_flow), and links — it does **not** create live automations, deploy webhooks, or call external integration APIs from this surface.

Workspace context for honest verification (read-only expectations, not execution):

- `/automations/jobs` — job queue posture when implementation is discussed  
- `/automations/webhooks` — inbound webhook design notes vs product reality  
- `/os/email-marketing-premium/preview` — when email_sequence overlaps ESP strategy paperwork  
- `/help` — data retention, PII, or compliance escalations  

---

## Scope (minimum real)

- **Delivery discipline:** Process map, triggers, owners, and failure modes documented before client sign-off.
- **Honesty:** Template records agreed automation types only — no “we already wired Salesforce” unless product says so.
- **Testing posture:** UAT criteria and rollback expectations explicit — no phantom end-to-end runs from this OS page.

---

## Limits (explicit non-goals)

- No creation of real workflows, schedules, or webhook receivers from this template.
- No third-party CRM, ESP, or iPaaS API connections from this OS surface.
- Does not modify closed product fronts; does not open `/crm/deals`.

---

## Premium checklist (automation consulting delivery)

| Area | Premium expectation |
| --- | --- |
| READY | Golden path / `pnpm gate` discipline when automation-related surfaces ship in the same release train. |
| PROCESS DIAGNOSIS | As-is/to-be, stakeholders, and data sources documented — PII boundaries explicit. |
| FLOW MAP | Triggers, branches, SLAs, and idempotency notes honest. |
| AUTOMATION DESIGN | Type matrix (workflow, webhook, CRM, email, scoring, reporting, integration) aligned to contract. |
| IMPLEMENTATION | Phasing, credentials handling, and environment separation described — execution outside template. |
| TESTING & VALIDATION | UAT cases, negative paths, and monitoring hooks agreed. |
| DOCUMENTATION | Runbooks, RACI, and handoff pack listed — no auto-generated wiki from OS. |
| REPORTING & METRICS | KPI definitions and attribution limits explicit — template records expectations only. |

---

## Mini X‑EXEC

1. Open `/os/consultoria-automatizacion-premium/preview` and walk deliverables for the demo project.  
2. Open `/automations/jobs` and `/automations/webhooks` to contrast paperwork vs product routes.  
3. Skim `/help` when PII or webhook security is in scope.  
4. Run golden path (`/os/excellence/golden-path`) before closing the checklist.
