# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-21** — KI-029 mig 512–516 OK; deploy `922c8039` FAILED (headers)

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** — schema prod ≥516; app viva aún SHA `3d2bba18` (deploy KI-029 falló al arrancar) |
| **Deploy KI-029** | `922c8039-2aa3-42a0-8a18-e5ae9c5a8142` **FAILED** · tip `a82d618f` · **sin 2º redeploy** |
| **preDeployCommand** | Manifest final: `["pnpm -C apps/web migrate:prod"]` |
| **Migrate logs** | **SÍ** — `[migrate] run/done` 512…516 · `all migrations complete` |
| **Prod mig** | **512–516 presentes** (read-only `DATABASE_PUBLIC_URL`) |
| **SHA vivo (health)** | `3d2bba18bcae` (réplica anterior; nuevo deploy no healthy) |
| **Falló runtime** | `Cannot find module './src/lib/security/headers'` → healthcheck fail · **KI-030** |
| **IA prod** | OFF |
| **Costes nuevos** | **0** |

---

## Próximo paso EXACTO

Reparar runtime `apps/web/src/lib/security/headers` en imagen root Dockerfile (COPY/resolución bajo `WORKDIR /app`) → **un** redeploy autorizado → verificar SHA vivo=`a82d618f` (o tip del fix) + health 200. **No** 2º redeploy del FAILED `922c8039`. SQL/migrate manual **prohibido**.
