# HANDOVER — NELVYON

> **Lee este archivo primero.**  
> Última actualización: **2026-07-19** — Workforce Bloques **C–G** done · cert **CONDITIONAL_PASS** · `nelvyonAutonomousWorkforceCertified=false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Fase 1** | Interno READY · prod bloqueada por terceros (SES/Stripe) |
| **Fase 2 Elite** | **PASS** repo · no romper |
| **Workforce A–B** | Inventario + hierarchy/aliases/ephemeral/modes ✅ |
| **Workforce C** | `OrchestratorDaemon` + persist + compose profile `orchestrator` + tests restart/recovery/dead-letter/kill-switch/pause ✅ |
| **Workforce D–F** | Promoted runtime: `cto`,`marketing`,`operations`,`devops`,`social_media`,`product` + ads evals · ~45 workflows catalog · ephemeral-only design/video/image/documentation ✅ |
| **Workforce G** | `leaderboard.ts` · `canaryPipeline.ts` · panel `workflows`/`runtime`/`canaries`/`leaderboard` ✅ |
| **Workforce H / cert** | **CONDITIONAL_PASS** · `workforce_certification.json` · **certified=false** |
| **Runtime Private AI** | **~23** agents (no 17) |
| **OS / Autonomous** | ~1634 OS **no** en Unified · 14 autonomous stack paralelo |
| **Freeze** | Router / MCP / Specialization / Elite **intactos** |

---

## Próximo paso EXACTO

1. **Ops residuals (P0 externos):** Docker/pgvector residual (KI-016/018) · aplicar/verificar mig **514** Shared Memory en staging · OpenClaw URL autorizada (opcional) · SES production access + Stripe prod  
2. **Opcional live probes:** `NELVYON_WORKFORCE_LIVE_OLLAMA=1` + suite OpenClaw dedicada — documentar en cert; **no** forzar `certified=true` sin evidencia  
3. **No** declarar `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED=true` hasta PASS real (hoy imposible por blockers externos + skipped)

---

## Evidencia

```powershell
node scripts/run-workforce-cert.mjs
pnpm -C apps/web exec vitest run backend/saas/__tests__/workforceBlockB.test.ts backend/saas/__tests__/workforceBlockC.test.ts backend/saas/__tests__/workforceBlockDEFG.test.ts --reporter=dot
node scripts/run-phase2-elite-cert.mjs
```

Docs: `AUTONOMOUS_RUNTIME.md` · `AUTONOMOUS_WORKFORCE_CERT.md` · `AGENT_WORKFORCE_INVENTORY.md` · `CURSOR_OPEN_SOURCE_INTEGRATION_AUDIT.md`
