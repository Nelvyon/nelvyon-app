# Observability local drill — Block 22

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T11:27:28.051Z |
| Scope | **Local / free** `OpsObservabilityCore` only |
| Paid APM (Datadog / New Relic / PagerDuty) | **NOT claimed** — PREPARED_OFF / not installed |
| Vitest `OpsObservabilityCore.test.ts` | PASS |
| Integrity `assertOpsObservabilityCoreIntegrity` | PASS |
| Incident runbook | `docs/ops/INCIDENT_RUNBOOK.md` |
| Status | **IMPLEMENTED_VERIFIED (local core)** |

## Demonstrated controls

### 1. Correlation id
`drill-ms0abhv6-1-dov130`

### 2. Structured log
```json
{
  "level": "info",
  "message": "observability_local_drill_started",
  "correlationId": "drill-ms0abhv6-1-dov130",
  "tenantId": "tenant-drill-synthetic",
  "context": {
    "surface": "ops_observability_core",
    "paidApm": false
  },
  "timestampMs": 1784978848050
}
```

### 3. Metric increment
- Counter `drill_requests_total` after `increment(1)` + `increment(2)` → **3**

### 4. Simulated alert (in-memory only — not paging)
```json
{
  "id": "alert-1-ms0abhv6",
  "severity": "P2",
  "message": "simulated_latency_blip_local_only",
  "correlationId": "drill-ms0abhv6-1-dov130"
}
```

### 5. Health snapshot
- Probes: **4**
- Runbook path: `docs/ops/INCIDENT_RUNBOOK.md`
- Snapshot timestampMs: 1784978848050

### 6. Rollback / kill notes
- Flag rollback preferred over code revert (docs/ops/INCIDENT_RUNBOOK.md).
- NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1 — RAG kill switch
- NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1 — AI canary kill
- NELVYON_ADS_SPEND_ENABLED=0 — ads spend remain OFF
- AUTONOMOUS_ALLOW_OPENAI=0 — no OpenAI spend
- Paid APM (Datadog/New Relic): NOT claimed — PREPARED_OFF / not installed

## Honestidad

- Este drill **no** activa vendors de APM de pago.
- `simulateAlert` es un stand-in local in-memory (ver INCIDENT_RUNBOOK) — **no** pagina a humanos.
- Sin red obligatoria; staging URL en snapshot es solo para etiquetar probes de health conocidos.
