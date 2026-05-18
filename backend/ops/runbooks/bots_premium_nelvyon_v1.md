# NELVYON Premium OS Standards — Bots v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

Bots Premium OS Standards for NELVYON v1 (client delivery checklist layered on BOTS PROFESIONALES v1 — EN SOMBRA)

## Relationship to BOTS PROFESIONALES v1 (closed)

**BOTS PROFESIONALES v1 EN SOMBRA** remains the implemented product boundary.  
This **Bots Premium** template is **OS-facing delivery paperwork**: statuses, evidence, and links — it does **not** add engines, intents, connectors, or new bot APIs.

Suggested product touchpoints for verification (unchanged by this template):

- `/app/assistant` — professional assistant surface aligned with bots v1  
- `/help` — structured help/support paths that often pair with assistant scope  
- `/automations/*` — when bot actions interact with jobs or webhooks  

---

## Scope (minimum real)

- **Delivery discipline:** Operators reconcile checklist items with honest capability of closed bots front — no phantom integrations.
- **Conversation hygiene:** Scripts, escalation, and test evidence documented before client sign-off.
- **Observability posture:** Releases that touch automations or help surfaces get a proportional observability glance.

---

## Limits (explicit non-goals)

- Does not implement LLM provider toggles, RAG backends, or new bot runtimes here.
- Does not modify bots v1 codebase or agent pipelines.
- Does not promise unmanaged channel sprawl (unsanctioned bots per workspace).

---

## Premium checklist (bots delivery)

| Area | Premium expectation |
| --- | --- |
| READY | Golden path green before declaring bot engagement READY. |
| PRODUCT ALIGNMENT | `/app/assistant` and related UX reviewed against promised scope — no extras sold. |
| INTEGRATIONS | Only documented, governed hooks (see automations/webhooks posture in ops notes). |
| HANDOFF | Human path explicit when automation stops (helpdesk / inbox conventions). |
| METRICS | Reporting claims limited to observable signals — bots evals/smoke gates pass for touched code (when applicable). |

---

## Mini X‑EXEC

1. Open `/os/bots-premium/preview` and walk deliverables for the demo project.  
2. Open `/app/assistant`; confirm narratives match checklist language.  
3. Skim `/help` and `/automations/webhooks` if integrations are in scope story.  
4. Run golden path before closing the engagement checklist.
