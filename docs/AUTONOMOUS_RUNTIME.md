# AUTONOMOUS RUNTIME — Orchestrator Daemon (Bloque C)

> Estado real repo · **2026-07-19** · Independent of Cursor IDE  
> Gate workforce: **CONDITIONAL_PASS** · `nelvyonAutonomousWorkforceCertified=false`

---

## Qué es

`OrchestratorDaemon` (`backend/orchestrator/daemon.ts`) — poll loop supervisado sobre `InMemoryAgentOrchestrator`, con checkpoint file-backed y kill switch. **No** es un segundo orquestador OS.

Flag principal: `NELVYON_ORCHESTRATOR_DAEMON=1` (también acepta `true`).

---

## Flags / env

| Variable | Default | Rol |
|----------|---------|-----|
| `NELVYON_ORCHESTRATOR_DAEMON` | `0` | Activa daemon (`isOrchestratorDaemonEnabled`) |
| `NELVYON_ORCHESTRATOR_ENABLED` | `0` | Orquestador API / enqueue (compose lo pone a `1`) |
| `NELVYON_ORCH_PERSIST_DIR` | unset | Dir checkpoint; **requerido** para recovery tras restart |
| `NELVYON_ORCH_HEALTH_DIR` | unset | Escribe `orchestrator_daemon_health.json` |
| `NELVYON_ORCH_POLL_MS` | `2000` | Intervalo tick |
| `NELVYON_ORCH_LEASE_MS` | `30000` | Lease por job en ejecución |
| `NELVYON_ORCHESTRATOR_LIVE` | `0` | Executor live Ollama (opcional; tests usan sandbox) |
| `NELVYON_ORCH_DEFER` | `0` | Defer drain (daemon / defer mode) |

Sin `NELVYON_ORCH_PERSIST_DIR` → jobs solo in-memory (mismo comportamiento pre–Bloque C).

---

## Persistencia

- Store: `backend/orchestrator/persistentStore.ts`
- Archivo: `{NELVYON_ORCH_PERSIST_DIR}/orchestrator_jobs.json` (write atómico `.tmp` → rename)
- Al arrancar: `loadPersistedJobs` + `recoverJobsAfterRestart`
- Recovery: estados `running` | `waiting_tool` | `waiting_approval` → `queued` (`lastError` ≈ `recovered_after_restart`)
- Terminales (`succeeded`, `dead_letter`, `failed`, `cancelled`) se conservan

Compose volume: `nelvyon_orch_persist` → `/var/nelvyon/orch` (`persist` + `health`).

---

## Docker Compose profile

```bash
# backend/local-ai/docker-compose.yml
docker compose --profile orchestrator up -d orchestrator-daemon
```

Servicio `orchestrator-daemon`:

- Image `node:20-bookworm-slim`
- Cmd: `node scripts/orchestrator-daemon.mjs`
- Healthcheck lee `orchestrator_daemon_health.json` (`ready` o `status===ok`)

---

## Health / ready / live

`DaemonHealth` (también panel `GET /api/saas/ai-agents?resource=runtime`):

| Campo | Significado |
|-------|-------------|
| `status` | `ok` \| `stopped` \| `paused` \| `emergency_stop` \| `degraded` |
| `running` | Loop activo |
| `paused` | `pause()` — no procesa jobs |
| `ready` | `running && !paused && !emergencyStop` |
| `live` | `running && lastTickAt != null` |
| `workerId` | `orch-daemon-{uuid8}` |
| `ticks` / `jobsProcessed` / `lastError` | Observabilidad |

Archivo: `{NELVYON_ORCH_HEALTH_DIR}/orchestrator_daemon_health.json`.

---

## Pause / resume / kill switch

| API | Efecto |
|-----|--------|
| `daemon.pause()` / `resume()` | Congela / reanuda ticks (health `paused`) |
| `triggerEmergencyStop()` | `operationModes.ts` — modo `emergency_stop`; daemon no drena jobs |
| `clearEmergencyStop(mode?)` | Reanuda (default `assisted`) |
| `AUTONOMOUS_HARD_DENY` | Incluye `deploy_production`, `send_mass_campaign`, `delete_data`, billing/creds/shell |

Tests: `backend/saas/__tests__/workforceBlockC.test.ts` (restart/recovery/dead-letter/kill-switch/pause).

---

## Job states

`OrchestratorJobState` (`contracts.ts`):

`queued` · `scheduled` · `running` · `waiting_approval` · `waiting_tool` · `succeeded` · `failed` · `cancelled` · `dead_letter`

Daemon path (sandbox executor):

1. Drain queued → `running` + lease payload  
2. OK + validated → `succeeded`  
3. Fallo y `attempts < maxAttempts` → re-`queued` con backoff (`ORCHESTRATOR_RESILIENCE.retryBackoffMs`)  
4. Agotados intentos → `dead_letter`

---

## Cómo arrancar (local)

```powershell
$env:NELVYON_ORCHESTRATOR_DAEMON="1"
$env:NELVYON_ORCHESTRATOR_ENABLED="1"
$env:NELVYON_ORCH_PERSIST_DIR=".nelvyon/orch-persist"
$env:NELVYON_ORCH_HEALTH_DIR=".nelvyon/orch-health"
node scripts/orchestrator-daemon.mjs
```

O profile compose (arriba).

---

## No claims

- Daemon **no** implica `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED=true`
- Default prod: flags OFF
- Ejecución default en cert/tests: **sandbox determinista**, no spend/deploy real
