# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-24** — Cert 5 packs beta (ADR-048/050) · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (no READY) |
| **Fase** | Certificar social/content/cro/analytics/brand |
| **ADR-048** | **REJECT/DEFER** Matomo/Umami · 0 installs |
| **Prod IA** | **OFF/ABSENT** |
| **claimReady** | **false** — legal campañas |

### Rollback staging

`NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0`

---

## Próximo paso EXACTO

1. Push tip mappers beta → esperar staging live SHA.  
2. `railway run --service ideal-victory --environment staging -- node scripts/staging-smoke-beta-packs-e2e.mjs --skip-wait` → exigir ALL_PASS por pack.  
3. Promote solo packs ALL_PASS; los que fallen permanecen BETA.  
4. Legal checklist campañas (bloquea claimReady).  
5. No activar IA/mesh en prod sin CEO.

SSOT: `OS_UNIVERSAL_SERVICE_CATALOG.md` · `SERVICE_BETA_PACKS.md` · ADR-048 · ADR-050
