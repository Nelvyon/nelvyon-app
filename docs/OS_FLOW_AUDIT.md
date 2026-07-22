# OS Production Flows Audit — 2026-07-22

> Evidence-based · IA prod **OFF** · Cost 0 · No promote of beta without cert

## External blockers (document only — no bypass)

| Blocker | Exact human step |
|---------|------------------|
| Cloudflare DNS | CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` → verify `https://app.nelvyon.com/api/health/live` 200. No MFA bypass. |
| Staging smokes | Set GitHub/Actions secret `STAGING_QA_PASSWORD` for QA operator. Do not commit password. |
| Base empresas legal | Do not scrape/use proprietary company DBs without license. Use only licensed or owned datasets. |

---

## Growth packs (núcleo)

| Pack | Kickoff | Playbook | Deliverables | Portal | QA≥85 | LOCAL Ollama | PROD (IA OFF) |
|------|---------|----------|--------------|--------|-------|--------------|---------------|
| local-business-growth | ✅ | ✅ DIA_A_DIA | ✅ dedicated | `/portal` | ✅ | **partial** (3b often needs_review; 8b can PASS) | **blocked** |
| ecommerce-growth | ✅ | ✅ | ✅ | `/portal` | ✅ | **partial** | **blocked** |
| saas-b2b-growth | ✅ | ✅ | ✅ | `/portal` | ✅ | **partial** | **blocked** |

**PROD blocked reason:** no `OLLAMA_*` / OpenAI allow on Railway; kickoff returns `LLM_NOT_CONFIGURED`. Correct until CEO activates local-AI architecture (`ARCHITECTURE_LOCAL_AI_RUNTIME.md`).

---

## Beta packs — promote?

| Pack | Catalog | Promote to available? | Missing |
|------|---------|----------------------|---------|
| social-calendar | beta | **NO** | dedicated deliverables · cert PASS · E2E in P0 · pack-specific playbook |
| content-strategy | beta | **NO** | same |
| cro-audit | beta | **NO** | same |
| analytics-setup | beta | **NO** | same |
| brand-voice | beta | **NO** | same |

All stay `availability: "beta"` until cert + dedicated production mappers + evidence.

---

## Quality routing (code)

- ADR-036: `AUTONOMOUS_QUALITY_ROUTING=1` → critical roles use `OLLAMA_STRATEGY_MODEL` (8b); others 3b.
- Certified Model Router **unchanged**.
- QA threshold **85** unchanged; fail → `needs_review` (orchestrator).

---

## Partners

| Area | Status |
|------|--------|
| Attribution | ✅ SaaS attribution API |
| Dashboard | ✅ `/saas/partner` + `/saas/affiliates` + unified snapshot API |
| Commission calc | ✅ |
| Payouts | **CEO_GATE OFF** |

---

## Claim

`claimComplete: false` · `claimEliteOps: false` · CONDITIONAL_READY
