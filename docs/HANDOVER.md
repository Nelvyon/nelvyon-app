# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — OpenAI opt-in only + prompt schemas · local QA 3b/8b · Cloudflare CNAME sole blocker

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (app+schema OK; DNS app pendiente) |
| **SHA vivo prod** | `bba71f14afc1` · live/ready **200** |
| **Docs tip** | tip + commit OpenAI opt-in only / prompt schemas |
| **Prod mig** | **512–516** (KI-R029) |
| **Stripe** | ✅ **KI-R028** — `price-audit` **allValid=true** |
| **SES** | ✅ KI-R014 |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app`. No MFA bypass attempted. |
| **P0 portal smoke** | ✅ PASS |
| **Pack E2E smoke staging** | 🟡 `LLM_NOT_CONFIGURED` = **staging config** (no fallo prod) |
| **Local Ollama** | ✅ `:11434` · 6 models |
| **llmAdapter policy** | ✅ Ollama primary · OpenAI **opt-in only** (`AUTONOMOUS_ALLOW_OPENAI=1`) · no auto-fallback · vitest **3/3** · phaseC **10/10** · saasEnv OK · tsc **0** |
| **Local pack gate** | ✅ `run-os-pack-gate` ALL_GATE_PASS (51) |
| **Phase C Ollama QA** | 3b **qa=55** fail · 8b **qa=89** pass · threshold **85** unchanged · `.release-logs/hardening-ia-packs-20260722.txt` |
| **HTTP pack kickoff local** | ✅ kickoff+Ollama `mode=real` · smoke as-complete 🟡 `needs_review` (QA&lt;85 3b = **model limit**) |
| **IA prod** | OFF |
| **Costes nuevos** | **0** |

---

## Clasificación LLM_NOT_CONFIGURED

- Staging `ideal-victory`: `AUTONOMOUS_PRODUCTION` SET · **sin** `OPENAI_API_KEY` / `OLLAMA_*` / `NELVYON_LOCAL_AI_URL`
- Local Ollama: reachable `127.0.0.1:11434` (6 models) — **no** enlazado a staging
- **Prohibido** setear staging `OLLAMA_HOST=http://localhost:11434` (Railway no alcanza el PC)
- **No** es regresión de producción ni de SHA `bba71f14`
- Camino seguro 0-coste: Ollama local (evidencia `.release-logs/hardening-ia-packs-20260722.txt`) o Ollama **alcanzable desde staging** (no localhost PC)
- OpenAI en packs autónomos: **OFF** por defecto; requiere `AUTONOMOUS_ALLOW_OPENAI=1` + key + no PRIVATE_MODE (o ventana internet)

---

## Evidencia hardening IA packs (2026-07-22)

| Path | Resultado | Motivo |
|------|-----------|--------|
| A) vitest `llmAdapter.ollama` + `phaseC` + `saasEnv` | **PASS** 22/22 | OpenAI opt-in contract; no auto-fallback |
| A) `tsc --noEmit` | **PASS** 0 | Fix `isInternetTaskAuthorized` import |
| A) `run-os-pack-gate.mjs` | **PASS** | 51 tests · ALL_GATE_PASS |
| B) Phase C 3b heliovolt | **qa=55** fail | blocking: `STRUCT-copy-hero`, `L-SOP-02` CTA múltiple · **model/hardware limit** |
| B) Phase C 8b (opcional) | **qa=89** pass | evidence only — larger local model clears 85 |
| B) HTTP kickoff Next+Ollama | **needs_review** | run `c61cb100…` · `mode=real` 3b · smoke espera `completed` |
| OpenAI paid / staging→localhost | **None** | |

---

## Próximo paso EXACTO

Humano Cloudflare DNS (zona `nelvyon.com`): Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` → verificar `https://app.nelvyon.com/api/health/live` 200.  
No MFA bypass attempted.  
No staging→localhost Ollama. No activar IA en prod. No Railway deploy en esta pasada.
