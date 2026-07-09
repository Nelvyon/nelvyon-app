# KNOWN_ISSUES — Errores conocidos

> No eliminar hasta resolver. Mover a **Historial resuelto** con solución.

---

## Activos

### KI-001 — `relation "saas_ceo_brief_settings" does not exist` (42P01)

| Campo | Valor |
|-------|-------|
| **Severidad** | Alta (cron prod) |
| **Ruta** | `POST /api/cron/saas-ceo-brief` |
| **Causa** | Migración `494_saas_ceo_brief.sql` no estaba aplicada en prod (pre-deploy 2026-07-09) |
| **Mitigación código** | ✅ commits `224a0a36` + deploy `815e4c0f` — respuesta `schema_not_ready` sin crash |
| **Fix definitivo** | `releaseCommand` migrate en deploy `5c2be62e` (SUCCESS) — **confirmación SQL pendiente** |
| **Estado** | 🟡 Código desplegado; tabla/índices no verificados por falta SSH Railway |

---

### KI-003 — Working tree cambios setup dev sin commit

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja |
| **Archivos** | `config.py`, `load_env_files.py`, `README-dev-Windows.md`, `backend/README.md` |
| **Fix** | Commitear en PR separado o revertir |

---

### KI-005 — Private AI sin runtime

| Campo | Valor |
|-------|-------|
| **Severidad** | Esperado (Fase 2) |
| **Detalle** | Sin LLM/RAG ingest activo |
| **Fix** | Activar según ROADMAP Fase 2 |

---

### KI-006 — CI Staging Elite Gate falla en `815e4c0f`

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Workflow** | Staging Elite Gate — run `29018913963` |
| **Tests** | `packSeedMetadata.test.ts` (INSERT deliverable no encontrado), workflow tests relacionados |
| **Fix** | Investigar drift pack orchestrator vs tests |

---

### KI-007 — Tests locales `saasWorkflowsS30` — `toIso` undefined

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Archivo** | `backend/saas/__tests__/saasWorkflowsS30.test.ts` |
| **Error** | `Cannot read properties of undefined (reading 'toISOString')` en `SaasWorkflowService.ts:178` |
| **Fix** | Mock DB debe devolver `created_at`/`updated_at` en filas de workflow runs |

---

### KI-008 — CEO brief cron no verificado post-deploy

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Detalle** | Último cron prod conocido: HTTP 500 (2026-07-09 10:20 UTC, pre-deploy). Post-deploy `815e4c0f` sin test HTTP |
| **Fix** | SSH Railway + `scripts/check-cron-ceo-brief.mjs` o esperar cron 07:00 UTC |

---

### KI-009 — Railway SSH no configurado en entorno agente

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (ops) |
| **Detalle** | `railway ssh` requiere clave en `~/.ssh/` — no presente en PC agente |
| **Fix** | `ssh-keygen -t ed25519` + `railway ssh keys add` |

---

## Historial resuelto

### KI-R001 — `Settings object has no attribute "database_url"`

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-07 |
| **Causa** | `__getattr__` dinámico + sin `.env` + sin `load_env_files()` |
| **Solución** | Pydantic fields + `load_env_files()` en `config.py` + `.env` local |

---

### KI-R002 — Commit producción sin push

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Solución** | `git push origin main` — `origin/main` en `815e4c0f` |

---

### KI-R003 — CLAUDE.md migración desactualizada

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Solución** | `CLAUDE.md` actualizado a `511_idempotency_keys.sql` en commit docs |

---

## Plantilla nuevo issue

```markdown
### KI-XXX — Título
| Campo | Valor |
| Severidad | |
| Ruta / servicio | |
| Causa | |
| Fix | |
| Estado | |
```
