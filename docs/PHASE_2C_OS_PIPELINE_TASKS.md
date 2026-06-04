# Fase 2C — Pipeline y tareas OS (operación diaria)

## Decisión de tablas

| Tabla evaluada | Uso | Decisión |
|----------------|-----|----------|
| `crm_deals` | CRM workspace UUID / contactos | **No** — dominio CRM legacy, no OS interno |
| `deals` / `pipeline_deals` | Legacy genérico | **No** — mezcla con otros productos |
| `saas_contact_activities` | SaaS CRM Fase 1 | **No** — explícitamente fuera de alcance |
| `activities` / `tasks` legacy | Entidades antiguas tenant | **No** |
| **`os_deals`** | Pipeline comercial/operativo NELVYON | **Creada** — migración `281_os_deals_tasks.sql` |
| **`os_tasks`** | Tareas internas equipo | **Creada** — misma migración |

Separación: prefijo `os_*`, endpoints `/api/v1/entities/os_deals` y `os_tasks`, UI solo bajo `/os/*`.

## Tablas creadas

### `os_deals`

- `title`, `status` (`nuevo` | `contactado` | `propuesta` | `ganado` | `perdido`)
- `client_id`, `project_id` (opcional, sin FK DB — coherencia en UI)
- `estimated_value`, `assignee`, `notes`
- `user_id`, `workspace_id`, timestamps

### `os_tasks`

- `title`, `description`, `status` (`pendiente` | `en_progreso` | `bloqueada` | `completada`)
- `priority` (`baja` | `media` | `alta`), `due_date` (string ISO/fecha)
- `client_id`, `project_id`, `assignee`
- `user_id`, `workspace_id`, timestamps

## Endpoints (FastAPI)

| Recurso | Base | Auth |
|---------|------|------|
| Oportunidades | `GET/POST /api/v1/entities/os_deals` | `require_workspace` / `require_workspace_operator` (write) |
| Oportunidad ID | `GET/PUT/DELETE .../os_deals/{id}` | Igual |
| Tareas | `GET/POST /api/v1/entities/os_tasks` | Igual |
| Tarea ID | `GET/PUT/DELETE .../os_tasks/{id}` | Igual |

Filtros: query param `query` JSON (`status`, `client_id`, `project_id`, `priority`).

Frontend: `apps/web/src/features/os-shell/pipeline/api.ts`, `tareas/api.ts`.

## Rutas UI

| Ruta | Función |
|------|---------|
| `/os/pipeline` | Kanban por estado + cambio rápido de estado |
| `/os/pipeline/nuevo` | Crear oportunidad (`?client_id=` / `?project_id=`) |
| `/os/pipeline/[id]` | Detalle / editar / eliminar |
| `/os/tareas` | Tabla + filtros estado/prioridad + marcar completada |
| `/os/tareas/nuevo` | Crear tarea |
| `/os/tareas/[id]` | Detalle / editar / completar / eliminar |
| `/os/clientes/[id]` | Oportunidades y tareas relacionadas + CTAs |
| `/os/proyectos/[id]` | Igual por `project_id` |
| `/os/dashboard` | KPIs: abiertas, ganadas, pendientes, vencidas, clientes/proyectos |

## Relaciones

- Oportunidad/tarea → `nelvyon_clients.id` vía `client_id`
- Oportunidad/tarea → `nelvyon_projects.id` vía `project_id`
- Sin FK en SQL (misma convención que otros `nelvyon_*`); integridad operativa en formularios OS

## Qué funciona

- CRUD real workspace-scoped (sin mocks)
- Pipeline kanban 5 columnas
- Tareas con filtros y overdue en dashboard/listado
- Dashboard métricas desde API
- Vínculos desde detalle cliente/proyecto
- Permisos UI `useOsPermissions` (operator+ write)

## Pendiente

- Migración automática en todos los entornos (ejecutar `pnpm migrate` / `281_os_deals_tasks.sql`)
- FK opcionales + `ON DELETE` si se quiere cascada estricta
- Drag-and-drop kanban (hoy: select de estado en tarjeta)
- Notificaciones / asignación a `user_id` real del workspace (hoy `assignee` texto libre)
- Batch endpoints (no requeridos en 2C)

## Riesgos

- Tablas nuevas vacías hasta migración — UI muestra “Sin datos todavía”
- `assignee` no valida miembros del workspace
- Fechas `due_date` como string; comparación overdue depende de formato `YYYY-MM-DD`
- Reutilizar `crm_deals` por error rompería separación SaaS/OS — evitado con `os_*`
