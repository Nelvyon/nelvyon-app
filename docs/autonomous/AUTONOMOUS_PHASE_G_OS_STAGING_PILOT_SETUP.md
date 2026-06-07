# NELVYON Autonomous — Phase G: OS Staging Pilot Setup

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Alcance:** Solo OS staging — **no** SaaS, web pública, producción real ni portal cliente visible.

---

## 1. Objetivo

Crear el **cliente y proyecto piloto** en OS staging para el piloto restaurant landing (Phase F → Phase G).

| Campo | Valor |
|-------|-------|
| **Cliente** | La Brasa del Raval |
| **Proyecto** | Landing Reserva Directa |
| **Slug proyecto** | `LANDING-RESERVA-DIRECTA` |
| **Sector** | `restaurant` |
| **SKU** | `landing` (NELVYON-LANDING) |
| **Workspace** | Staging operador (típ. `1`) |

---

## 2. Prerrequisitos

- API OS staging accesible (ej. `http://localhost:8000` o URL staging interna)
- JWT de usuario con rol **owner**, **admin** u **operator** en el workspace
- Phase F ejecutada → `backend/autonomous/output/phase-f/restaurant-landing/osPublishPayload.json`
- Variables **no** activadas aún: `AUTONOMOUS_PRODUCTION=true` (solo tras dry-run OK)

---

## 3. Crear cliente OS

### curl (bash)

```bash
export NELVYON_API_URL="http://localhost:8000"
export OPERATOR_JWT="<jwt-operador>"
export WORKSPACE_ID=1

curl -s -X POST "$NELVYON_API_URL/api/v1/os/clients" \
  -H "Authorization: Bearer $OPERATOR_JWT" \
  -H "X-Workspace-Id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "La Brasa del Raval",
    "sector": "restaurant",
    "notes": "Phase G autonomous pilot — staging only"
  }' | jq .
```

### PowerShell

```powershell
$NELVYON_API_URL = "http://localhost:8000"
$OPERATOR_JWT = "<jwt-operador>"
$WORKSPACE_ID = 1

$body = @{
  business_name = "La Brasa del Raval"
  sector = "restaurant"
  notes = "Phase G autonomous pilot — staging only"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "$NELVYON_API_URL/api/v1/os/clients" `
  -Headers @{
    Authorization = "Bearer $OPERATOR_JWT"
    "X-Workspace-Id" = "$WORKSPACE_ID"
  } `
  -ContentType "application/json" `
  -Body $body
```

**Guardar** el `id` devuelto → `OS_PILOT_CLIENT_ID`.

---

## 4. Crear proyecto OS

Sustituir `<CLIENT_UUID>` por el ID del paso anterior.

### curl

```bash
curl -s -X POST "$NELVYON_API_URL/api/v1/os/projects" \
  -H "Authorization: Bearer $OPERATOR_JWT" \
  -H "X-Workspace-Id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<CLIENT_UUID>",
    "name": "Landing Reserva Directa",
    "status": "active",
    "priority": "medium",
    "metadata": {
      "project_slug": "LANDING-RESERVA-DIRECTA",
      "sku": "landing",
      "autonomous_pilot": "phase-g-restaurant-landing"
    }
  }' | jq .
```

### PowerShell

```powershell
$CLIENT_UUID = "<CLIENT_UUID>"
$body = @{
  client_id = $CLIENT_UUID
  name = "Landing Reserva Directa"
  status = "active"
  priority = "medium"
  metadata = @{
    project_slug = "LANDING-RESERVA-DIRECTA"
    sku = "landing"
    autonomous_pilot = "phase-g-restaurant-landing"
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post `
  -Uri "$NELVYON_API_URL/api/v1/os/projects" `
  -Headers @{
    Authorization = "Bearer $OPERATOR_JWT"
    "X-Workspace-Id" = "$WORKSPACE_ID"
  } `
  -ContentType "application/json" `
  -Body $body
```

**Guardar** el `id` devuelto → `OS_PILOT_PROJECT_ID`.

---

## 5. Variables de entorno Phase G

```bash
export OS_PILOT_CLIENT_ID="<CLIENT_UUID>"
export OS_PILOT_PROJECT_ID="<PROJECT_UUID>"
export OS_PILOT_WORKSPACE_ID=1
export OS_PILOT_PROJECT_SLUG="LANDING-RESERVA-DIRECTA"
```

PowerShell:

```powershell
$env:OS_PILOT_CLIENT_ID = "<CLIENT_UUID>"
$env:OS_PILOT_PROJECT_ID = "<PROJECT_UUID>"
$env:OS_PILOT_WORKSPACE_ID = "1"
$env:OS_PILOT_PROJECT_SLUG = "LANDING-RESERVA-DIRECTA"
```

Plantilla JSON: `backend/autonomous/fixtures/phase-g-staging-refs.example.json`

---

## 6. Verificación setup

```bash
# Cliente existe
curl -s "$NELVYON_API_URL/api/v1/os/clients/$OS_PILOT_CLIENT_ID" \
  -H "Authorization: Bearer $OPERATOR_JWT" \
  -H "X-Workspace-Id: $WORKSPACE_ID" | jq .business_name

# Proyecto existe y FK correcta
curl -s "$NELVYON_API_URL/api/v1/os/projects/$OS_PILOT_PROJECT_ID" \
  -H "Authorization: Bearer $OPERATOR_JWT" \
  -H "X-Workspace-Id: $WORKSPACE_ID" | jq '{name, client_id}'
```

Esperado: `business_name` = "La Brasa del Raval", `name` = "Landing Reserva Directa".

---

## 7. Siguiente paso

Seguir el runbook: `docs/autonomous/AUTONOMOUS_PHASE_G_STAGING_OS_RUNBOOK.md`
