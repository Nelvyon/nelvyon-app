# Auditoría NELVYON OS v1 comercial

**Fecha:** 2026-06-06 (post OS-1-UI-02)  
**Alcance:** Clientes → Proyectos → Tareas → Entregables → Portal cliente  
**Fuera de alcance:** SaaS, web pública, motor agentes `/api/os/*`

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| **Finalización OS v1 comercial (ponderada)** | **~62%** |
| **Backend / schema OS-1** | ~88% |
| **UI interna `/os/*` canónica** | ~48% |
| **Portal cliente** | ~72% |
| **Prod-ready (migraciones + backfill + RLS)** | ~35% |

**Veredicto:** El **flujo entregables end-to-end** (interno + portal) es vendible en beta cerrada con workspace ya migrado. **Clientes/proyectos/tareas** siguen en UI legacy (`nelvyon_*` / `entities/os_tasks`) aunque las APIs canónicas existen. **No** lanzar comercial abierto hasta backfill prod verificado y UI canónica en los 5 módulos.

---

## Metodología de %

Cada módulo se puntúa en 5 ejes (0–100), peso igual dentro del módulo:

| Eje | Peso interno |
|-----|--------------|
| Schema + migraciones | 20% |
| API REST estable | 25% |
| UI OS interna | 25% |
| Portal / cliente final | 15% |
| Prod (backfill, RLS, ops) | 15% |

**% global** = media ponderada de los 5 módulos prioritarios OS-1:

| Módulo | Peso comercial |
|--------|----------------|
| Clientes | 20% |
| Proyectos | 20% |
| Tareas | 15% |
| Entregables | 25% |
| Portal cliente | 20% |

---

## Tabla por módulo

| Módulo | Estado % | Qué existe | Bloqueantes | Tiempo est. |
|--------|----------|------------|-------------|-------------|
| **Clientes** | **58%** | `os_clients` 315, backfill script, API `/api/v1/os/clients`, UI `/os/clientes` sobre `nelvyon_clients` | UI no migrada a canónica; backfill prod no verificado; sin RLS | 1–2 sem |
| **Proyectos** | **55%** | `os_projects` 316, backfill, API `/api/v1/os/projects`, UI legacy `nelvyon_projects` | Misma brecha UI; FK entregables depende de backfill cliente/proyecto | 1–2 sem |
| **Tareas** | **62%** | `os_tasks` 317, API `/api/v1/os/tasks`, UI `/os/tareas` en `/entities/os_tasks` (IDs numéricos legacy) | UI no usa API canónica UUID; sin vínculo entregable desde tarea | 1 sem |
| **Entregables** | **82%** | `os_deliverables` 318, versiones 319, API workflow completa, **UI `/os/entregables` OS-1-UI-02**, portal approve/reject OS-1-10/11, portal UI OS-1-UI-03 | Upload real (solo URL); backfill desde `nelvyon_outputs`; documentos legacy paralelos | 3–5 d |
| **Portal cliente** | **72%** | Auth invite/login, proyectos, entregables, approve/reject, estados visuales | Notificaciones email; multi-usuario por cliente; branding white-label | 1–2 sem |

### Cálculo global

```
0.20×58 + 0.20×55 + 0.15×62 + 0.25×82 + 0.20×72
= 11.6 + 11.0 + 9.3 + 20.5 + 14.4
= 66.8%  → redondeo conservador ~62% (penalización prod -5%)
```

Penalización **prod -5%**: migraciones 315–319 en repo pero aplicación/backfill en producción no auditada en este entorno.

---

## Inventario técnico (snapshot)

### Tablas canónicas OS-1

| Tabla | Migración | Estado |
|-------|-----------|--------|
| `os_clients` | 315 | ✅ |
| `os_projects` | 316 | ✅ |
| `os_tasks` | 317 | ✅ |
| `os_deliverables` | 318 | ✅ |
| `os_deliverable_versions` | 319 | ✅ |
| Portal access / reviews | 320+ | ✅ parcial |

### APIs

| API | Backend | UI consumidora |
|-----|---------|----------------|
| `/api/v1/os/clients` | ✅ | ⚠️ solo pickers entregables |
| `/api/v1/os/projects` | ✅ | ⚠️ solo pickers entregables |
| `/api/v1/os/tasks` | ✅ | ❌ UI usa `/entities/os_tasks` |
| `/api/v1/os/deliverables` | ✅ | ✅ `/os/entregables` |
| `/api/v1/portal/*` | ✅ | ✅ `/portal/*` |

### UI OS interna

| Ruta | Fuente datos | Estado |
|------|--------------|--------|
| `/os/clientes` | `nelvyon_clients` | Legacy |
| `/os/proyectos` | `nelvyon_projects` | Legacy |
| `/os/tareas` | `entities/os_tasks` | Híbrido |
| `/os/entregables` | `os_deliverables` | **Canónico (OS-1-UI-02)** |
| `/os/documentos` | `nelvyon_outputs` | Legacy paralelo |

---

## Qué se puede vender hoy

- Operación interna de **entregables con workflow y portal de aprobación** (beta cerrada, 1 workspace piloto).
- Portal cliente: ver proyectos, revisar entregables publicados, aprobar/rechazar con feedback.
- CRM operativo legacy en clientes/proyectos/tareas (sin prometer unificación canónica aún).

## Qué NO vender todavía

- “OS unificado 100%” — UI clientes/proyectos aún legacy.
- Upload seguro de archivos / almacenamiento gestionado de entregables.
- Multi-tenant portal enterprise (SSO, auditoría formal).
- Garantía prod sin runbook migraciones 315–319 + backfill.

---

## Roadmap mínimo hasta v1 comercial (~85%)

| # | Ticket | Impacto | Semanas |
|---|--------|---------|---------|
| 1 | OS-1-UI-01 Clientes UI → `/api/v1/os/clients` | +8% global | 0.5 |
| 2 | OS-1-UI-04 Proyectos UI → `/api/v1/os/projects` | +8% | 0.5 |
| 3 | OS-1-UI-05 Tareas UI → `/api/v1/os/tasks` | +5% | 0.5 |
| 4 | Prod: migraciones + backfill clients/projects | +10% prod | 0.5 |
| 5 | Upload entregables (storage_key + signed URLs) | +5% entregables | 1 |
| 6 | Deprecar `/os/documentos` entregas legacy | +3% | 0.5 |
| 7 | Portal: notificaciones + invite UX | +5% portal | 1 |

**Total estimado:** 4–5 semanas → **~85% v1 comercial**.

---

## Commits recientes OS-1 (referencia)

| Ticket | Commit | Entrega |
|--------|--------|---------|
| OS-1-10 | `caa8cac` | Portal approve/reject backend |
| OS-1-11 | `a757bdb` | Versionado + create-revision |
| OS-1-UI-03 | `d00eed7` | Portal frontend |
| **OS-1-UI-02** | **`19eea04`** | **UI interna entregables** |

---

*Auditoría read-only basada en codebase local; no sustituye verificación de producción.*
