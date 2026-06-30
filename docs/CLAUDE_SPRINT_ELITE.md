# CLAUDE_SPRINT_ELITE.md — Sprint cierre Nelvyon (anti-atasco)

> **Pega este archivo a Claude Code.** Todo lo que necesita ya existe en el repo — no reinventar.

```
Repo: C:/Users/Asus/Downloads/app_v181
Prod: https://nelvyon.com
git pull origin main

═══════════════════════════════════════════════════════════════
VISIÓN (2 pilares — NO bajar a MVP)
═══════════════════════════════════════════════════════════════
1. NELVYON OS — Mejor agencia marketing autónoma del mundo (29 servicios + packs)
2. NELVYON SaaS — Mejor SaaS real ≥ GoHighLevel + HubSpot (59 módulos sidebar)

═══════════════════════════════════════════════════════════════
ARCHIVOS YA LISTOS (LEER, NO RECREAR)
═══════════════════════════════════════════════════════════════
docs/INVENTARIO_FRENTES.md      ← 98 frentes tablas A/B/C/D
docs/PARITY_GHL_HUBSPOT.md      ← paridad GHL/HubSpot (45+ filas)
docs/LAUNCH_OPS_CHECKLIST.md    ← ops manual + curls (FASE FINAL)
scripts/staging-smoke-saas-all-modules.mjs  ← smoke 59 SaaS (YA EXISTE)
scripts/lib/saas-nav-modules.mjs          ← parser nav
CLAUDE.md                       ← reglas no negociables

═══════════════════════════════════════════════════════════════
REGLAS ANTI-ATASCO (OBLIGATORIO)
═══════════════════════════════════════════════════════════════
1. NO ScheduleWakeup / NO loops de espera > 3 min — todo en foreground
2. NO re-ejecutar regresión global (c1-c6, P0, b1-b4) salvo tras TU push
3. Si falta credencial AWS/Stripe/Twilio → marcar [MANUAL] en checklist, SEGUIR
4. Si un ítem > 45 min → documentar bloqueo, pasar al siguiente
5. Commit + push cada fix → sleep 120s solo si tocaste BFF/rutas prod
6. NO commitear: .bat envato, envato-seeds-metadata*, voice_pilot_*, .claude/
7. NO tocar SAAS_HIDDEN_ROUTES (/saas/dashboard/* mock)
8. NO activar coming_soon sin OAuth real

═══════════════════════════════════════════════════════════════
FASE 1 — Verificación rápida (15 min, foreground)
═══════════════════════════════════════════════════════════════
git log -1 --oneline
Confirmar docs/INVENTARIO_FRENTES.md y docs/PARITY_GHL_HUBSPOT.md existen.
pnpm -C apps/web exec tsc --noEmit
Si FAIL → fix → commit → push → continuar

═══════════════════════════════════════════════════════════════
FASE 2 — Smoke 59 SaaS (YA HAY SCRIPT)
═══════════════════════════════════════════════════════════════
$env:STAGING_BASE_URL="https://nelvyon.com"
node scripts/staging-smoke-saas-all-modules.mjs --skip-wait

Criterio: ALL_CRITICAL_PASS (warnings API 401 por tenant = OK)
Si FAIL page → fix UI mínimo → commit → push → re-run SOLO este script

═══════════════════════════════════════════════════════════════
FASE 3 — Fixes código conocidos (solo si aún fallan)
═══════════════════════════════════════════════════════════════
YA HECHOS en main reciente (verificar antes de re-hacer):
- /api/v1/billing/summary BFF (p1 WARN)
- /api/reports/crm BFF (b4)
- /saas/afiliados → redirect /saas/affiliates
- adsBffRoute nunca 401 en GET

PENDIENTE opcional (uno a uno, no todos a la vez):
- HubSpot/Slack token exchange real Python (si env vars)
- Conectores coming_soon (integrationsCatalog) — máx 1 por commit

═══════════════════════════════════════════════════════════════
FASE 4 — OS Agencia (29 servicios)
═══════════════════════════════════════════════════════════════
Leer backend/os-agents/seeds/os-service-template-catalog.ts
Por servicio sin preview: solo documentar en INVENTARIO — NO crear 29 carpetas en un sprint
Verificar 3 packs P0 siguen PASS si tocaste packs

═══════════════════════════════════════════════════════════════
FASE 5 — Gates locales (solo si tocaste código)
═══════════════════════════════════════════════════════════════
pnpm -C apps/web exec vitest run backend/saas --reporter=dot
cd backend && python -m pytest tests/ -q --tb=short -x

═══════════════════════════════════════════════════════════════
FASE 6 — OPS MANUAL (SOLO DOCUMENTAR — NO EJECUTAR)
═══════════════════════════════════════════════════════════════
Actualizar docs/LAUNCH_OPS_CHECKLIST.md [ ] si falta algo.
Curls ya en ese doc. Marcar "USUARIO SOLO" para SES/Stripe/crons/OAuth.
NO inventar secrets. NO quedarse bloqueado aquí.

═══════════════════════════════════════════════════════════════
FASE 7 — ENVATO PLANTILLAS (NO HACER — USUARIO LOCAL)
═══════════════════════════════════════════════════════════════
Descargas .bat / metadata = post-launch local. NO commitear.

═══════════════════════════════════════════════════════════════
ENTREGABLE FINAL
═══════════════════════════════════════════════════════════════
Imprimir tabla:

| Gate | PASS/FAIL |
| tsc | |
| saas-all-modules (59) | |
| código fixes commits | lista SHAs |

VEREDICTO CÓDIGO ÉLITE: SÍ/NO
BLOQUEOS MANUAL: lista vars
NO terminar sin ALL_CRITICAL_PASS en saas-all-modules o explicar cada FAIL
```

## Frentes totales (referencia rápida)

| Capa | N |
|---|---|
| SaaS sidebar | 59 |
| OS servicios premium | 29 |
| OS platform nav | 10 |
| OS workspace smokes | 12 |
| **Total producto** | **98** |

## Smokes existentes (NO re-ejecutar todos)

| Script | Cuándo |
|---|---|
| `run-staging-p0-smokes.mjs` | Solo tras cambio packs/portal |
| `staging-smoke-c1`…`c6`, `b1-b4`, `p1`, `a1`, `visual-polish` | Ya verdes jun-2026 |
| `run-os-autonomous-gate.mjs` | Tras cambio kickoff/cron |
| **`staging-smoke-saas-all-modules.mjs`** | **Este sprint — ejecutar** |
