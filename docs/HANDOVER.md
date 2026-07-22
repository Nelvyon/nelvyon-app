# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Elite-next: arch local-AI + ADR-036 quality routing + flow/ops audits · prod SHA `2b51581ddaf6` · flags OFF

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** |
| **SHA vivo prod** | `2b51581ddaf6` · live/ready **200** |
| **IA / MCP / SM / OpenClaw / OpenAI / CEO payouts** | **OFF / ABSENT** |
| **Quality routing** | Código ADR-036 · flag `AUTONOMOUS_QUALITY_ROUTING` **OFF** default |
| **Local AI runtime** | Arquitectura lista · **no activada** (`ARCHITECTURE_LOCAL_AI_RUNTIME.md`) |
| **Beta packs** | Permanecen **beta** (no promote sin cert+deliverables) |
| **OS flows prod** | Kickoff wiring PASS · ejecución IA **blocked** (flags OFF) — `OS_FLOW_AUDIT.md` |
| **Costes nuevos** | **0** |
| **Cloudflare** | CNAME `app.nelvyon.com` pendiente |
| **Smokes staging** | Bloqueados `STAGING_QA_PASSWORD` |

---

## Próximo paso EXACTO

1. Humano: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app`.  
2. CEO: revisar `ARCHITECTURE_LOCAL_AI_RUNTIME.md` (Option A Tailscale) antes de cualquier Ollama alcanzable.  
3. No activar `AUTONOMOUS_QUALITY_ROUTING` / IA prod / OpenAI / CEO payouts sin auth.  
4. Opcional: secret `STAGING_QA_PASSWORD` para smokes.

SSOT: `docs/OS_FLOW_AUDIT.md` · `docs/OPS_QUALITY_AUDIT.md` · ADR-036
