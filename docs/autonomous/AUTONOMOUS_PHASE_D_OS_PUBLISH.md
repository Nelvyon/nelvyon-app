# NELVYON Autonomous — Phase D: OsPublish → os_deliverables (staging)

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Estado:** Implementado — capa delgada aislada, sin portal auto-publish

---

## 1. Objetivo

Conectar el contrato `OsPublishPayload` (Phases B/C) con `os_deliverables` en **modo staging controlado**:

- Validación completa (workspace, client, project, QA ≥ 85)
- **Dry-run por defecto** — sin escrituras DB
- Escritura staging solo con `AUTONOMOUS_PRODUCTION=true` + `dry_run=false`
- Nunca `visibility=client_visible` automático
- Entregables en `status=in_review`, `visibility=internal`
- Trazabilidad en metadata + audit event

---

## 2. Endpoint

```
POST /api/v1/os/autonomous/publish
```

| Header | Requerido |
|--------|-----------|
| `Authorization: Bearer <jwt>` | Sí |
| `X-Workspace-Id` | Sí |
| `Content-Type: application/json` | Sí |

**RBAC:** owner, admin u operator del workspace (`require_workspace_operator`).  
Viewer/member → **403**.

---

## 3. Payload (`OsPublishPayload`)

```json
{
  "dry_run": true,
  "project_id": "sim-landing-1700000000000",
  "os_refs": {
    "client_id": "<os_clients.uuid>",
    "project_id": "<os_projects.uuid>",
    "project_slug": "LANDING-ACME-SOLAR-Q2",
    "workspace_id": 1
  },
  "deliverables": [
    {
      "type": "url",
      "label": "Landing staging",
      "value": "https://staging.example.com",
      "visibility": "client"
    }
  ],
  "qa_score": 90,
  "autonomous_job_id": "autonomous_job_abc123",
  "artifacts": { "build": { "staging_url": "https://staging.example.com" } },
  "handoff_email_draft": {
    "subject": "Listo para revisión interna",
    "body_markdown": "..."
  },
  "os_actions": [
    { "entity": "deliverable", "action": "create", "status": "in_review" }
  ],
  "note": "Phase D controlled staging"
}
```

**Notas:**

- `os_refs.project_id` es el UUID canónico de `os_projects` (no el `project_id` de simulación del job).
- `visibility: client` en el payload se **ignora** en DB — siempre se persiste `internal`.
- `qa_score < 85` → **422**.

---

## 4. Reglas de seguridad

| Regla | Comportamiento |
|-------|----------------|
| `AUTONOMOUS_PRODUCTION` | Default `false` (env). Sin flag → `dry_run=false` devuelve **403** |
| `dry_run=true` | Valida FKs, devuelve preview, **no escribe** `os_deliverables` |
| `dry_run=false` + flag | Crea N entregables `in_review` / `internal` |
| Portal | **No** auto-publish al cliente |
| Workspace | `os_refs.workspace_id` debe coincidir con header; otro WS → **404** |
| Audit | `os.autonomous.publish` en `security_events` al escribir staging |

---

## 5. Respuesta

```json
{
  "dry_run": true,
  "production_enabled": false,
  "written": false,
  "qa_score": 90,
  "created": [],
  "deliverables_preview": [
    {
      "title": "Landing staging",
      "type": "url",
      "status": "in_review",
      "visibility": "internal",
      "metadata": { "autonomous_provenance": true, "autonomous_phase": "D" }
    }
  ],
  "message": "Dry-run: no database writes performed"
}
```

Metadata en entregables creados incluye:

- `autonomous_provenance: true`
- `autonomous_phase: "D"`
- `autonomous_job_id`, `qa_score`, `artifacts`, `requested_visibility`

---

## 6. Cómo probar dry-run

```bash
# 1. Simular pipeline (genera payload)
pnpm -C apps/web autonomous:phase-c landing

# 2. Dry-run contra API (requiere JWT operador + IDs OS reales)
curl -X POST http://localhost:8000/api/v1/os/autonomous/publish \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-Id: 1" \
  -H "Content-Type: application/json" \
  -d @backend/autonomous/examples/landing-os-publish.example.json
```

Con `dry_run: true` (default): respuesta 200, `written: false`, conteo de `os_deliverables` sin cambios.

**Tests:**

```bash
cd backend && python -m pytest tests/test_os_autonomous_publish.py -q
```

---

## 7. Cómo activar staging controlado

```bash
# Solo en entorno staging/controlado — NUNCA en prod sin revisión interna
export AUTONOMOUS_PRODUCTION=true

# Payload con dry_run=false y os_refs.project_id UUID real
curl -X POST ... -d '{ "dry_run": false, ... }'
```

Flujo recomendado:

1. Operador ejecuta pipeline Phase C → payload JSON
2. Resuelve `os_refs.client_id` + `os_refs.project_id` en OS
3. **Dry-run** primero (validación)
4. Con flag + permisos, `dry_run=false` → entregables `in_review`
5. Revisión humana interna → workflow manual `deliver` / `publish` al portal

Cliente TypeScript:

```ts
import { postOsAutonomousPublish } from "../../backend/autonomous/publish/osPublishClient";

await postOsAutonomousPublish(payload, {
  baseUrl: process.env.NELVYON_API_URL!,
  workspaceId: 1,
  bearerToken: process.env.OPERATOR_JWT!,
});
```

---

## 8. Archivos

| Archivo | Rol |
|---------|-----|
| `backend/routers/os_autonomous.py` | Router FastAPI |
| `backend/services/os_autonomous_publish_service.py` | Lógica staging + QA gate |
| `backend/tests/test_os_autonomous_publish.py` | Tests de contrato y seguridad |
| `backend/autonomous/publish/osPublishClient.ts` | Cliente HTTP interno |
| `backend/autonomous/publish/osPublishPayload.ts` | Builder payload (dry_run default) |

---

## 9. Autonomía actualizada

| Fase | Capacidad | % pipeline |
|------|-----------|------------|
| A | Contratos + prompts + QA rubrics | +10% |
| B | Simulación offline mock | +25% |
| C | LLM adapter + QA offline | +37% |
| **D** | **Publish staging controlado → os_deliverables** | **+8%** |

**Autonomía estimada tras Phase D: ~80%** (3 SKUs piloto: Landing, Chatbot, SEO).

Pendiente para >85%: portal handoff automático post-revisión humana, OAuth ads, excepciones legales.

---

## 10. Fuera de alcance (intencional)

- SaaS / CRM SaaS
- Web pública / portal público sin dry-run
- `visibility=client_visible` automático
- Producción real sin flag explícito
