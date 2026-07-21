# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-21** — KI-029: `preDeployCommand` versionado en `/railway.toml`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** — app sana; mig 512–516 vía próximo redeploy con preDeploy |
| **Prod SHA (pre-redeploy)** | `3d2bba18bcae` |
| **Prod mig** | máx **511** (read-only verificado) |
| **Config real Railway** | `configFile=/railway.toml` · `dockerfilePath=/Dockerfile` |
| **Fix tip** | `preDeployCommand = ["pnpm -C apps/web migrate:prod"]` + Dockerfile scripts/`WORKDIR /app` |
| **IA prod** | OFF |
| **Costes nuevos** | **0** |

---

## Próximo paso EXACTO

Commit/push config + docs → **un** `railway redeploy --from-source -y` → logs `migrate:prod` + `_migrations` 512–516 + health + smokes. Si falla: no 2º redeploy; entregar log exacto.
