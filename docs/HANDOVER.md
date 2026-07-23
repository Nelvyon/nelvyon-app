# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-24** — Post-mesh cierre · Pack E2E **ALL_PASS completed** · `claimReady: false` (legal)

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (gates staging mesh PASS; no READY) |
| **Tip / staging live** | `99b307306078` · deploy `c2e48d13` **SUCCESS** · live/ready **200** |
| **MESH** | **PASS** · `MESH_JOIN_OK proxies_set=1` · peer `nelvyon-staging-web-3` `100.97.102.64` **active** |
| **Ollama privado** | **PASS** · listen `100.102.207.30:11434` only · loopback **CLOSED** · public `:11434` **False** · sesión mesh ESTABLISHED |
| **Pack E2E** | **ALL_PASS** · run completed · 5 deliverables `approved_by_client` · portal invite+BFF PASS · log `.release-logs/pack-e2e-99b30730-*.txt` |
| **Portal packs smoke** | **ALL_PASS** |
| **Tenant isolation** | vitest CRM+Deals **16/16 PASS** |
| **Prod IA/mesh** | **ABSENT** (AI/mesh/router/QR/MCP/SM/payouts/TS/OLLAMA/OPENAI_API_KEY/AUTONOMOUS_ALLOW_OPENAI) |
| **claimReady** | **false** — único bloqueo: legal checklist campañas |

### Rollback emergencia (2 flags → 0)

Solo staging `ideal-victory`: `NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0`  
Opcional: `NELVYON_MESH_OPTION_A=0` · unset `TS_AUTHKEY`

---

## Próximo paso EXACTO

1. **Legal externo:** firmar checklist campañas (bloquea `claimReady`).  
2. Opcional: rotar OpenAI key si fue expuesta en logs históricos de agente (ya **ABSENT** en Railway prod).  
3. No activar IA/mesh/OpenAI/MCP/SM/payouts en producción sin aprobación CEO explícita.

SSOT: `docs/ops/MESH_OPTION_A_STAGING.md` · `docs/CTO_FINAL_VERIFY.md` · ADR-044–046
