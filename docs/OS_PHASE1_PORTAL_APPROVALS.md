# OS-1-10 — Aprobación cliente portal sobre entregables

Permite que clientes del portal aprueben o rechacen entregables **publicados** y **client_visible**.

## Migración 320

**Archivo:** `backend/db/migrations/320_os_deliverable_reviews.sql`

- Tabla **`os_deliverable_reviews`** — historial de decisiones portal
- Columnas en **`os_deliverables`**: `client_reviewed_at`, `approved_by_portal_user_id`
- Nuevos status: **`approved_by_client`**, **`changes_requested`**

## Endpoints portal

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/portal/deliverables/{id}/approve` | Cliente aprueba |
| `POST` | `/api/v1/portal/deliverables/{id}/reject` | Cliente rechaza (feedback obligatorio) |

Auth: **JWT portal** (`portal: true`).

### Approve body (opcional)

```json
{ "feedback": "Optional comment" }
```

### Reject body (obligatorio)

```json
{ "feedback": "Required explanation" }
```

## Reglas de aprobación

El cliente solo puede revisar entregables que:

- `workspace_id` y `client_id` coinciden con el token portal
- `visibility = client_visible`
- `status = published` (pendiente de revisión cliente)

**Approve:**

- `status` → `approved_by_client`
- `approved_at`, `client_reviewed_at` → timestamp UTC
- `approved_by_portal_user_id` → portal user id
- `metadata.client_feedback`, `portal_user_id`, `reviewed_at`, `client_review_decision`
- Fila en `os_deliverable_reviews` (`decision=approve`)

**Reject:**

- `status` → `changes_requested`
- `client_reviewed_at` → timestamp UTC
- **feedback obligatorio** → 400 si falta
- Misma metadata + historial + fila review (`decision=reject`)

**Doble revisión:** si ya está `approved_by_client` o `changes_requested` → **400**.

**No permitido:** entregables internos (`visibility=internal`) o de otro cliente → **404**.

## API interna (lectura)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/os/deliverables/{id}` | Incluye `client_reviewed_at`, `approved_by_portal_user_id`, metadata |
| `GET` | `/api/v1/os/deliverables/{id}/client-reviews` | Historial de revisiones portal |

## Listado portal actualizado

`GET /api/v1/portal/deliverables` muestra entregables `client_visible` en status:

- `published` (pendiente revisión)
- `approved_by_client`
- `changes_requested`

## Archivos

| Archivo | Rol |
|---------|-----|
| `backend/db/migrations/320_os_deliverable_reviews.sql` | Migración |
| `backend/models/os_deliverable_reviews.py` | Modelo historial |
| `backend/services/portal_deliverable_review_service.py` | Lógica approve/reject |
| `backend/routers/portal_rest.py` | Endpoints portal |
| `backend/tests/test_portal_deliverable_approvals.py` | Tests |

## Validación

```bash
pnpm migrate
pnpm validate:os-core-migrations
cd backend && python -m pytest tests/test_portal_deliverable_approvals.py -q
```

## Siguiente ticket

Re-publicación tras `changes_requested` (workflow interno → nueva versión → publish de nuevo).
