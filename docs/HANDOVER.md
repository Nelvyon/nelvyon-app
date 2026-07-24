# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-24** — Cert ecommerce+saas-b2b · Strategy/Funnel/Retention BETA · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (no READY) |
| **Fase activa** | OS packs cert + nuevos servicios BETA (ADR-049) |
| **Tip** | ver `git rev-parse HEAD` tras push |
| **Staging** | ecommerce E2E **ALL_PASS** · saas-b2b E2E **ALL_PASS** · mesh ON |
| **Prod IA/mesh** | **ABSENT/OFF** |
| **claimReady** | **false** — legal campañas |

### Evidencia certificación packs

| Pack | Log | Resultado |
|------|-----|-----------|
| ecommerce-growth | `.release-logs/ecommerce-pack-e2e-20260724-015452.txt` | ALL_PASS · completed · auto-approve |
| saas-b2b-growth | `.release-logs/saas-b2b-pack-e2e-20260724-022752.txt` | ALL_PASS · completed · 6 deliverables |

### Nuevos packs (código + flag · E2E post-deploy)

`strategy-pack` · `funnel-growth-pack` · `retention-pack`  
Flags: `NELVYON_STRATEGY_PACK` / `NELVYON_FUNNEL_PACK` / `NELVYON_RETENTION_PACK` (default OFF fuera staging)  
Smoke: `node scripts/staging-smoke-new-os-packs-e2e.mjs --skip-wait`

### Rollback emergencia staging

`NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0` · new packs `=0`

---

## Próximo paso EXACTO

1. **Push tip** → esperar staging live SHA match.  
2. Ejecutar `railway run --service ideal-victory --environment staging -- node scripts/staging-smoke-new-os-packs-e2e.mjs --skip-wait` → exigir **ALL_PASS**.  
3. Si ALL_PASS: subir strategy/funnel/retention a **IMPLEMENTED_VERIFIED** en catálogo + registry `elite` donde aplique.  
4. **Legal:** checklist campañas (bloquea claimReady / READY).  
5. **No** instalar Matomo/Umami sin ADR-048 CTO.  
6. **No** activar IA/mesh/OpenAI/MCP/SM/payouts en prod sin CEO.

SSOT: `OS_UNIVERSAL_SERVICE_CATALOG.md` · `OS_NEW_SERVICES_CONTRACTS.md` · `CTO_FINAL_VERIFY.md` · ADR-049
