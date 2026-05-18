# NELVYON Premium OS Standards — Email Marketing v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

Email Marketing Premium OS Standards for NELVYON v1 (client delivery checklist — **paperwork layer only**)

## Purpose

This **Email Marketing Premium** template is **OS-facing delivery paperwork**: statuses, evidence, email-type badges (newsletter, campaign, automation, transactional, nurturing), and links — it does **not** connect ESP APIs, send mail, or modify transports.

Suggested workspace touchpoints for honest verification:

- `/app/communications` — transactional / channel posture aligned with closed CANALES v1 narrative  
- `/campaigns` — when broadcast or promo email ties to named campaigns  
- `/automations/jobs`, `/automations/webhooks` — when drip or event flows are claimed  
- `/help` — compliance, abuse, or deliverability escalations  

---

## Scope (minimum real)

- **Delivery discipline:** Email program types reconciled with what ops can evidence without live ESP integration.
- **Creative & copy hygiene:** Templates, subjects, preheaders, and legal footers documented before client sign-off.
- **Deliverability posture:** Domain/DNS, suppression, and bounce handling described realistically — no inbox placement guarantees.

---

## Limits (explicit non-goals)

- No SendGrid/Mailgun/Amazon SES/Marketing Cloud API wiring from this template.
- Does not modify closed product fronts; does not open `/crm/deals`.
- No list purchase, scraping, or dark-pattern consent flows from this OS surface.

---

## Premium checklist (email marketing delivery)

| Area | Premium expectation |
| --- | --- |
| READY | Golden path / `pnpm gate` discipline when email-related web surfaces ship in the same release train. |
| STRATEGY & SEGMENTATION | Program mix (newsletter, campaign, automation, transactional, nurturing) explicit per engagement. |
| DESIGN & TEMPLATES | HTML/text variants, modules, and test-send evidence documented externally. |
| COPY & SUBJECTS | Subject/preheader matrix + spam-trigger review — no deceptive subjects. |
| AUTOMATIONS & FLOWS | Triggers and exit criteria documented; `/automations/*` only when product story allows. |
| DELIVERABILITY | SPF/DKIM/DMARC posture and suppression lists described — realistic SLAs. |
| METRICS & REPORTING | Opens/clicks/unsubs defined with baselines — template records expectations only. |

---

## Mini X‑EXEC

1. Open `/os/email-marketing-premium/preview` and walk deliverables for the demo project.  
2. Open `/app/communications` if transactional/channel alignment is in scope.  
3. Skim `/automations/jobs` when nurture or event flows are claimed.  
4. Run golden path (`/os/excellence/golden-path`) before closing the checklist.
