# HANDOVER — NELVYON

> **Lee este archivo primero.**  
> Última actualización: **2026-07-19** — Workforce Bloques A–C · `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED=false` (CONDITIONAL_PASS)

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Fase 1** | Interno READY · prod bloqueada por terceros |
| **Fase 2 Elite** | PASS repo · no romper |
| **Workforce** | A inventario ✅ · B hierarchy/aliases/ephemeral/modes ✅ · C persist+kill-switch ✅ |
| **Workforce cert** | **CONDITIONAL_PASS** · `workforce_certification.json` · **certified=false** |
| **Freeze** | Router / MCP / Specialization **intactos** |

---

## Próximo paso EXACTO

1. **Bloque D:** evals + tool maps para Engineering (`qa`, `development`, `cto` interim) sin mintar permanentes masivos  
2. Ampliar evals a agents sin cobertura (ads, email, workflows, portal)  
3. Ops: Docker pgvector · mig 514 · OpenClaw URL · SES/Stripe  

## Evidencia

```powershell
node scripts/run-workforce-cert.mjs
pnpm -C apps/web exec vitest run backend/saas/__tests__/workforceBlockB.test.ts --reporter=dot
node scripts/run-phase2-elite-cert.mjs
```
