# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-23** — Staging Mesh Option A **MESH_JOIN_OK** · Pack E2E mesh **needs_review** (Ollama real 3B/8B) · prod IA flags **ABSENT** · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (mesh staging verificado; no READY) |
| **Staging deploy** | `6aeb4106` **SUCCESS** (railway up · async kickoff + LF entrypoint) · live/ready **200** |
| **Ollama privado (PC)** | **PASS** — listen `100.102.207.30:11434` only · loopback **CLOSED** · public `:11434` unreachable |
| **Tailscale join staging** | **PASS** · logs `MESH_JOIN_OK proxies_set=1` · peer `nelvyon-staging-web-1` `100.71.134.87` **active** |
| **Unit tests (mesh)** | **44/44 PASS** |
| **Pack E2E staging** | **PASS mesh path** · kickoff **HTTP 202** async · run `f5de9c43` → `needs_review` · landing QA88 · SEO/chatbot QA soft-fail · `deliverables_published:5` · LLM `mode=real` 3b/8b |
| **Prod IA/mesh flags** | **ABSENT** (AI/mesh/router/MCP/SM/payouts) · residual `OPENAI_API_KEY` **PRESENT** but gates OFF (`AUTONOMOUS_ALLOW_OPENAI` ABSENT) |
| **OpenAI / OpenClaw / MCP / SM / payouts / campañas** | Staging: OpenAI=0 · MCP=0 · SM=0 · PAY=0 · Router=1 · QR=1 · Prod: OFF/ABSENT |
| **claimReady** | **false** |

### Rollback emergencia (2 flags → 0)

Solo staging `ideal-victory`: `NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0`  
Opcional: `NELVYON_MESH_OPTION_A=0` · unset `TS_AUTHKEY`

---

## Próximo paso EXACTO

1. Tras push de este tip: confirmar staging redeploy desde git (no solo railway up) · live `git_sha` match.  
2. Legal campañas: checklist externo (sigue bloqueando claimReady).  
3. Opcional: `TS_HOSTNAME=nelvyon-staging-web` · revisar residual `OPENAI_API_KEY` en prod (no activar IA).

SSOT: `docs/ops/MESH_OPTION_A_STAGING.md` · `docs/CTO_FINAL_VERIFY.md` · ADR-044 · ADR-045
