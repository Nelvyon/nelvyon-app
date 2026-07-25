# Influencers / PR pack E2E (ADR-058 · yellow point 2)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25 |
| Staging | https://ideal-victory-staging.up.railway.app |
| Tip / deploy | tip **`e81b5034`** · deploy **`85be1985` SUCCESS** |
| Flags | `NELVYON_INFLUENCERS_PR_PACK=1` · `NELVYON_PACK_INDEPENDENT_AUDITOR=1` · `AUTONOMOUS_ALLOW_OPENAI=0` |
| Result | influencers-pr-pack: **ALL_PASS** |
| Portal | **7** entregables · auto-approve · QA≥85 · `outreach_authorized=false` everywhere |
| OpenAI / paid / Pepito / real outreach | OFF / forbidden |
| claimReady | **false** |
| Log | `influencers_pr_e2e_run.txt` |

## Pre-fix (evidence of repair path)

| Run | Status | Detail |
|-----|--------|--------|
| `ebc09f8e-…` (pre ADR-058) | `needs_review` | `sku_chatbot` **QA 30 — escalado** (LLM invented blockers) → auditor/complete skipped · pack stayed reviewable |
| Fix | ADR-058 | `normalizeChatbotPlan` + soft-continue · no QA floor lower · no silent mock |

## Post-fix ALL_PASS

Steps: `sku_chatbot:done` · `influencers_pr:done` · `report:done` · `complete:done`

### Deliverables verified
Asistente de campañas de influencers y PR · Research matching · Scoring sheet · Brief outreach · Contrato / checklist · Metrics plan · Informe ejecutivo

### Isolation / gates
- Tenant workspace via operator JWT + `X-Workspace-Id`
- Independent auditor ON (pack completion gate)
- Auto-approve path = PASS when QA≥85
- REJECT/repair: demonstrated by pre-fix `needs_review` + QA review queue enqueue (shared pack orchestrator)
- Rollback: `NELVYON_INFLUENCERS_PR_PACK=0`

## Rollback staging

```
NELVYON_INFLUENCERS_PR_PACK=0
```
