# AUTONOMOUS WORKFORCE CERT — Gate final

> Harness: `scripts/run-workforce-cert.mjs`  
> Artefacto: `backend/local-ai/benchmarks/workforce_certification.json`  
> Criterio: **PASS** + `nelvyonAutonomousWorkforceCertified=true` solo con evidencia real (sin force-pass).

---

## Cómo ejecutar

```powershell
node scripts/run-workforce-cert.mjs
```

Live Ollama/RAG se activa **automáticamente** si `http://127.0.0.1:11434` responde.  
OpenClaw: mock certificado siempre; live solo si `NELVYON_OPENCLAW_BRIDGE_URL` está definida (no es skip).

Iteración local sin build (bloquea PASS porque `skipped≠0`):

```powershell
$env:NELVYON_WORKFORCE_SKIP_BUILD="1"
node scripts/run-workforce-cert.mjs
```

`NELVYON_WORKFORCE_FORCE_PASS=1` → **FAIL** + `force_pass_rejected`.

---

## Veredictos

| Verdict | certified | Cuándo |
|---------|-----------|--------|
| `FAIL` | false | Required step falla o force-pass |
| `CONDITIONAL_PASS` | false | Required OK pero `skipped>0` (p.ej. SKIP_BUILD) o evidencia incompleta |
| `PASS` | **true** | Required OK · `skipped=0` · sin blockers internos · live Ollama/RAG · mock OpenClaw · build · soak |

---

## Steps required

| id | Evidencia |
|----|-----------|
| `typecheck` | `tsc --noEmit` |
| `workforce_and_elite_regression` | Block B/C/DEFG + PassResiduals + phase2Elite/Runtime |
| `docs_and_runtime_artifacts` | Docs + daemon + catalog/leaderboard/canary |
| `phase1_phase2_freeze` | Router/MCP/Elite JSON freeze |
| `block_c_daemon` | daemon + compose profile |
| `soak_load` | `workforce_soak.json` (daemon burst) |
| `openclaw_mock` | mock en residuals (live URL opcional) |
| `production_build` | `pnpm -C apps/web build` + `.next/BUILD_ID` |
| `ollama_live` | auto si Ollama up → `workforce_live.json` |
| `rag_live` | misma evidencia live (RAG + isolation) |

---

## External notes (no bloquean PASS workforce)

Documentados en `externalNotes[]`: SES/Stripe Phase-1, Docker/pgvector opcional si RAG live OK, mig 514 ops, OpenClaw URL unset cuando mock OK.

---

## Artefactos

- `workforce_certification.json`
- `workforce_live.json`
- `workforce_soak.json`
