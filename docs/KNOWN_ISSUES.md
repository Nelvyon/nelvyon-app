# KNOWN_ISSUES — Errores conocidos

> No eliminar hasta resolver. Mover a **Historial resuelto** con solución.

---

## Activos

### KI-005 — Private AI sin runtime

| Campo | Valor |
|-------|-------|
| **Severidad** | Esperado (Fase 2) |
| **Detalle** | Sin LLM/RAG ingest activo |
| **Fix** | Activar según ROADMAP Fase 2 |

---

### KI-009 — Railway SSH no configurado en entorno agente

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (ops) |
| **Detalle** | `railway ssh` requiere clave en `~/.ssh/` |
| **Fix** | `ssh-keygen -t ed25519` + `railway ssh keys add` |

---

### KI-011 — SNS SES subscription sin confirmar

| Campo | Valor |
|-------|-------|
| **Severidad** | Media (ops) |
| **Detalle** | Confirmación manual AWS tras primer deploy |
| **Fix** | CEO — consola AWS SES/SNS |

---

## Historial resuelto

### KI-R005 — CI pack tests fallaban (packSeedMetadata, packAutoApprove)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Causa** | Mock `createPackRun` sin `{ run, created: true }` → early return en orchestrator |
| **Solución** | Corregidos mocks en tests pack |

---

### KI-R006 — releaseCommand no aplicaba migraciones

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Solución** | `migrate:prod` unificado + Dockerfile copia `scripts/` |

---

### KI-R007 — Setup dev local sin commit

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Solución** | Commiteado `config.py`, `load_env_files.py`, README dev |

---

### KI-R004 — CEO brief 42P01 + schema_not_ready

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 17:02 UTC |
| **Solución** | Migrate prod 482–511; cron `processed:1` |

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
