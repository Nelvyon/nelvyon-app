# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Prod closure tip `e62d52cc` SUCCESS · DNS/STAGING secrets bloqueados humanos

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** |
| **SHA vivo prod** | `e62d52cc5d61` · live/ready **200** · deploy `1613fbb5` |
| **IA flags Railway** | **ABSENT** (quality routing, OpenAI allow, MCP, SM, OpenClaw, CEO payouts, Local Router, OLLAMA*) |
| **Local AI prep** | Código `OllamaRuntimePrep` + canary doc · **mesh NO activado** |
| **Local Router default** | **OFF** (ADR-037) |
| **Beta packs** | Permanecen **beta** |
| **Cloudflare** | **BLOCKED_HUMAN** NXDOMAIN — CNAME `app` → Railway |
| **STAGING_QA_PASSWORD** | **BLOCKED_HUMAN** — secret ausente en gh |
| **Campañas empresas** | **BLOQUEADO_LEGAL** — checklist |
| **Costes** | **0** |
| **Evidence** | `.release-logs/prod-redeploy-closure-20260722.txt` |

---

## Próximo paso EXACTO

1. Humano: Cloudflare → CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` → health 200.  
2. Humano: crear secret GitHub `STAGING_QA_PASSWORD` (no en chat/repo).  
3. CEO: leer `docs/CTO_FINAL_CLOSURE_AUDIT.md` + `docs/ops/CANARY_IA_FLAGS.md` (batch aprobación staging canary — opcional).  
4. No Tailscale/Ollama/OpenAI/payouts sin auth.

SSOT cierre: `docs/CTO_FINAL_CLOSURE_AUDIT.md`
