# KNOWN_ISSUES — Errores conocidos

> No eliminar hasta resolver. Mover a **Historial resuelto** con solución.

---

## Activos

### KI-001 — `relation "saas_ceo_brief_settings" does not exist` (42P01)

| Campo | Valor |
|-------|-------|
| **Severidad** | Alta (cron prod) |
| **Ruta** | `POST /api/cron/saas-ceo-brief` |
| **Causa** | Migración `494_saas_ceo_brief.sql` no aplicada en prod |
| **Mitigación código** | ✅ commit `224a0a36` — respuesta `schema_not_ready` |
| **Fix definitivo** | `pnpm -C apps/web migrate` o SQL manual migración 494 |
| **Estado** | 🟡 Mitigado en código; migrate prod pendiente |

---

### KI-002 — Commit producción sin push

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Detalle** | `224a0a36` ahead 1 de `origin/main` |
| **Fix** | `git push origin main` |

---

### KI-003 — Working tree cambios setup dev sin commit

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja |
| **Archivos** | `config.py`, `load_env_files.py`, `README-dev-Windows.md`, `backend/README.md` |
| **Fix** | Commitear en PR separado o revertir |

---

### KI-004 — CLAUDE.md migración desactualizada

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (docs) |
| **Detalle** | Indica última mig `507`; repo tiene `511` |
| **Fix** | Actualizar CLAUDE.md línea migraciones |

---

### KI-005 — Private AI sin runtime

| Campo | Valor |
|-------|-------|
| **Severidad** | Esperado (Fase 2) |
| **Detalle** | Sin LLM/RAG ingest activo |
| **Fix** | Activar según ROADMAP Fase 2 |

---

## Historial resuelto

### KI-R001 — `Settings object has no attribute "database_url"`

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-07 |
| **Causa** | `__getattr__` dinámico + sin `.env` + sin `load_env_files()` |
| **Solución** | Pydantic fields + `load_env_files()` en `config.py` + `.env` local |

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
