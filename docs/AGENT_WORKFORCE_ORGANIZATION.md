# AGENT WORKFORCE ORGANIZATION

> ADR-027 · código: `backend/agents/workforce/hierarchy.ts`, `operationModes.ts`, `ephemeralWorkers.ts`

---

## Principio

Permanentes = Unified Registry (Private AI + specialist designs canónicos).  
**No** importar ~1634 OS agents ni fusionar Autonomous 14 sin ADR.  
No mintar cientos de IDs decorativos.

---

## Jerarquía

| Level | Rol | Ejemplos |
|-------|-----|----------|
| `L1_executive` | Dirección | `ceo_supervisor`, `cto`, `marketing`, `sales`, `finance`, `security_compliance`, `operations`, `product`, `support` |
| `L2_domain` | Dominio | `seo`, ads×3, `email_marketing`, `content`, `social_media`, `crm`, `portal_client`, `reporting`, `workflows`, `development`, `qa`, `devops` |
| `L3_specialist` | (reservado) | — |
| `ephemeral_worker` | Subtarea | Ver abajo |

Metadata: `reportsTo`, `lifecycle`, `operationModesAllowed`, `owner`.

---

## Lifecycle

`draft` → `sandbox` → `evaluated` → `certified` → `production` (+ `suspended` / `deprecated`)

`assertNotFalselyCertified`: lifecycle `certified`/`production` exige evidencia de eval.

Hoy la mayoría de perfiles workforce están en `evaluated` (no confundir con gate workforce PASS).

---

## Aliases (deprecated → canónico)

| Deprecated | Canonical |
|------------|-----------|
| `sem_google_ads` | `google_ads` |
| `automation` | `workflows` |
| `analytics` | `reporting` |
| `security` | `security_compliance` |

`resolveCanonicalAgentId` / `isDeprecatedAgentId`.

---

## Design-only efímeros (ADR-028)

`EPHEMERAL_ONLY_DESIGN_IDS`: `design`, `video`, `image`, `documentation`  
→ workers efímeros del orquestador; **no** permanentes thin en runtime.

Promovidos a runtime (Bloques D–F): `cto`, `marketing`, `operations`, `devops`, `social_media`, `product` (+ ads evals).

---

## Operation modes

| Mode | Tools | Memory write | External mutate |
|------|-------|--------------|-----------------|
| `observe` | no | no | no |
| `draft` | read-ish | no | no |
| `assisted` | sí | sí | no (sensitive → approval) |
| `autonomous` | sí | sí | limitado; hard-deny intacto |
| `emergency_stop` | no | no | no |

Global: `getGlobalOperationMode` / `triggerEmergencyStop` / `clearEmergencyStop`.

---

## Ephemeral workers

`ephemeralWorkers.ts` — subtareas sandbox; sin memoria permanente por defecto; no crean IDs en Unified Registry.

---

## Panel org

`GET /api/saas/ai-agents?resource=org` → L1/L2 desde Unified records (hierarchy overlay).
