# PHASE2 — OpenClaw

> Bridge runtime preparado · Default **Disabled** · Auth gate estricto

## Estado

| Pieza | Path | Estado |
|-------|------|--------|
| Contratos | `backend/openclaw/contracts.ts` | Auth = Memory ON + `NELVYON_OPENCLAW_BRIDGE_ENABLED` |
| Disabled | `DisabledOpenClawBridge` | Default |
| HTTP | `HttpOpenClawBridge` | Activo solo si autorizado + `NELVYON_OPENCLAW_BRIDGE_URL` |
| Factory | `getOpenClawBridge()` | Elige HTTP vs Disabled |

## Seguridad

- PRIVATE_MODE URL allowlist (`assertUrlAllowed`)
- `tenantId` obligatorio
- Forbidden tools filtrados (`OPENCLAW_ADAPTER_CONTRACT`)
- Max payload bytes
- Sin secretos en logs
- Rollback: `NELVYON_OPENCLAW_BRIDGE_ENABLED=0` o Memory OFF

## Ops (externo)

1. Shared Memory ON + mig 514
2. Desplegar sandbox OpenClaw con `POST /v1/dispatch`
3. `NELVYON_OPENCLAW_BRIDGE_URL=https://…` (host allowlisted)
4. `NELVYON_OPENCLAW_BRIDGE_ENABLED=1`

Hasta entonces el core delega a Nelvyon Private AI (`delegatedTo: nelvyon_private_ai`).
