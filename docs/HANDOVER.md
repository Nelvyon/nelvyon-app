# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Local pack E2E Ollama evidence · Cloudflare CNAME sole blocker

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (app+schema OK; DNS app pendiente) |
| **SHA vivo prod** | `bba71f14afc1` · live/ready **200** |
| **Docs tip** | `e15055e9` → + local E2E evidence commit |
| **Prod mig** | **512–516** (KI-R029) |
| **Stripe** | ✅ **KI-R028** — `price-audit` **allValid=true** |
| **SES** | ✅ KI-R014 |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app`. No MFA bypass attempted. |
| **P0 portal smoke** | ✅ PASS |
| **Pack E2E smoke staging** | 🟡 `LLM_NOT_CONFIGURED` = **staging config** (no fallo prod) |
| **Local Ollama** | ✅ `:11434` · 6 models · `/api/generate` PASS |
| **Local pack gate** | ✅ `run-os-pack-gate` ALL_GATE_PASS (51) |
| **HTTP pack kickoff local** | ❌ BLOCKED (Docker/Postgres/QA auth) |
| **IA prod** | OFF |
| **Costes nuevos** | **0** |

---

## Clasificación LLM_NOT_CONFIGURED

- Staging `ideal-victory`: `AUTONOMOUS_PRODUCTION` SET · **sin** `OPENAI_API_KEY` / `OLLAMA_*` / `NELVYON_LOCAL_AI_URL`
- Local Ollama: reachable `127.0.0.1:11434` (6 models) — **no** enlazado a staging
- **Prohibido** setear staging `OLLAMA_HOST=http://localhost:11434` (Railway no alcanza el PC)
- **No** es regresión de producción ni de SHA `bba71f14`
- Camino seguro 0-coste: Ollama local (evidencia `.release-logs/local-pack-e2e-ollama-20260722.txt`) o Ollama **alcanzable desde staging** (no localhost PC)

---

## Evidencia local pack E2E (2026-07-22)

| Path | Resultado | Motivo |
|------|-----------|--------|
| A) vitest `llmAdapter.ollama` | **FAIL** 1/3 | WIP unit mocks (untracked); prefers-Ollama → `mock` ≠ `real` |
| B) `run-os-pack-gate.mjs` | **PASS** | 51 tests · ALL_GATE_PASS |
| Live Ollama generate | **PASS** | `llama3.2:3b-instruct-q4_K_M` → `OK` |
| C) HTTP kickoff Next | **BLOCKED** | Docker daemon DOWN · Postgres :5432/5433/5434 closed · `.env` sqlite only · no `apps/web/.env` · no QA auth |

---

## Próximo paso EXACTO

Humano Cloudflare DNS (zona `nelvyon.com`): Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` → verificar `https://app.nelvyon.com/api/health/live` 200.  
No MFA bypass attempted.  
No staging→localhost Ollama. No activar IA en prod.
