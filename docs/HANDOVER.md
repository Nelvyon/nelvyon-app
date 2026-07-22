# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Cierre pendientes: prep IA + canaries OFF + audits · DNS/STAGING secrets bloqueados humanos

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** |
| **SHA vivo prod** | `06690725a67d` · live/ready **200** (pendiente redeploy tip cierre si aplica) |
| **IA flags Railway** | **ABSENT** (quality routing, OpenAI, MCP, SM, OpenClaw, CEO payouts, OLLAMA) |
| **Local AI prep** | Código `OllamaRuntimePrep` + canary doc · **mesh NO activado** |
| **Local Router default** | **OFF** (ADR-037) |
| **Beta packs** | Permanecen **beta** |
| **Cloudflare** | **BLOCKED_HUMAN** NXDOMAIN — CNAME `app` → Railway |
| **STAGING_QA_PASSWORD** | **BLOCKED_HUMAN** — secret ausente en gh |
| **Campañas empresas** | **BLOQUEADO_LEGAL** — checklist |
| **Costes** | **0** |

---

## Próximo paso EXACTO

1. Humano: Cloudflare → CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` → health 200.  
2. Humano: crear secret GitHub `STAGING_QA_PASSWORD` (no en chat/repo).  
3. CEO: leer `docs/CTO_FINAL_CLOSURE_AUDIT.md` + `docs/ops/CANARY_IA_FLAGS.md` (batch aprobación staging canary — opcional).  
4. No Tailscale/Ollama/OpenAI/payouts sin auth.

SSOT cierre: `docs/CTO_FINAL_CLOSURE_AUDIT.md`
