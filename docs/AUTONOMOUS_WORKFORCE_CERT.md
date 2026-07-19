# AUTONOMOUS WORKFORCE CERT — Gate Bloque H

> Harness: `scripts/run-workforce-cert.mjs`  
> Artefacto: `backend/local-ai/benchmarks/workforce_certification.json`  
> **Estado honesto:** `verdict=CONDITIONAL_PASS` · `nelvyonAutonomousWorkforceCertified=false`

---

## Cómo ejecutar

```powershell
node scripts/run-workforce-cert.mjs
```

Exit `0` si required gates OK y verdict ≠ `FAIL`.  
Exit `1` si algún required step falla o force-pass rechazado.

Live opcionales (nunca convierten skip en pass):

```powershell
$env:NELVYON_WORKFORCE_LIVE_OLLAMA="1"
# OPENCLAW_BRIDGE_URL — probe deferred; no se marca pass por skip
node scripts/run-workforce-cert.mjs
```

`NELVYON_WORKFORCE_FORCE_PASS=1` → **rechazado** (verdict FAIL + blocker `force_pass_rejected`).

---

## Veredictos

| Verdict | `nelvyonAutonomousWorkforceCertified` | Cuándo |
|---------|---------------------------------------|--------|
| `FAIL` | `false` | Algún step `required` falla, o force-pass |
| `CONDITIONAL_PASS` | **`false`** | Required internos OK; residuales externos / skipped live documentados |
| `PASS` | `true` | **No emitido hoy** — requiere cierre ops + evidencia live sin inventar |

**Significado de `certified=false`:** el código de Bloques C–G + docs + freeze Phase1/2 están; **no** se declara fuerza de trabajo autónoma certificada para prod. External blockers y probes skipped quedan en el JSON.

---

## Steps required (internos)

| id | Qué comprueba |
|----|----------------|
| `typecheck` | `pnpm -C apps/web exec tsc --noEmit` |
| `workforce_and_elite_regression` | vitest: `workforceBlockB/C/DEFG` + `phase2Elite` + `phase2Runtime` |
| `docs_and_runtime_artifacts` | Docs workforce + `daemon.ts` + catalog/leaderboard/canary |
| `phase1_phase2_freeze` | `router_certification_final.json` · `mcp_certification_final.json` · `phase2_elite_certification.json` |
| `block_c_daemon` | `daemon.ts` + compose service `orchestrator-daemon` |

---

## Skipped (honestidad)

| id | Motivo |
|----|--------|
| `ollama_live` | Solo si `NELVYON_WORKFORCE_LIVE_OLLAMA!=1` |
| `openclaw_live` | URL unset **o** deferred a suite OpenClaw dedicada |
| `production_build` | Costoso; manual `pnpm -C apps/web build` |
| `soak_load` | Soak Router/MCP dedicados — no parte del gate workforce default |

Skip ≠ pass. El report lista `skipped[]` y `blockers[]`.

---

## Blockers externos (siempre en CONDITIONAL_PASS)

1. `docker_pgvector_ops_residual_KI016`  
2. `migration_514_shared_memory_ops`  
3. `openclaw_authorized_url_optional`  
4. `ses_stripe_prod_ops`  

---

## Thresholds / no claims

- Phase 2 Elite PASS **intacta** e independiente.
- Security / isolation / recovery: evidencia en unit tests (`workforceBlockC`, eval suite) — claim en report: `not_100pct_live_prod` / `sandbox_deterministic`.
- `notClaimed` en JSON: `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED`, world-class agents, hundreds of permanent agents, 100% perfect.

---

## Relación con env de producto

No existe flag de producto que ponga `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED=true` automáticamente. Solo el harness puede emitir `nelvyonAutonomousWorkforceCertified=true` tras **PASS** real (aún no).
