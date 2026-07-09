# KNOWN_ISSUES — Errores conocidos

> No eliminar hasta resolver. Mover a **Historial resuelto** con solución.

---

## Activos

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
| **Estado** | ✅ Resuelto 2026-07-09 — mock `[]` para dedup recent-running |

---

### KI-010 — releaseCommand no aplicó migraciones 482–494

| Campo | Valor |
|-------|-------|
| **Severidad** | Media (ops) |
| **Detalle** | Deploy SUCCESS pero tablas 494 ausentes hasta migrate manual |
| **Mitigación** | Migrate manual vía `DATABASE_PUBLIC_URL` aplicado |
| **Fix** | Auditar logs releaseCommand Railway en próximo deploy |

---

### KI-009 — Railway SSH no configurado en entorno agente

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (ops) |
| **Detalle** | `railway ssh` requiere clave en `~/.ssh/` |
| **Fix** | `ssh-keygen -t ed25519` + `railway ssh keys add` |

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

### KI-R004 — CEO brief 42P01 + schema_not_ready

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 17:02 UTC |
| **Solución** | Migrate prod 482–511; cron `processed:1` (run `29035626812`) |

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
