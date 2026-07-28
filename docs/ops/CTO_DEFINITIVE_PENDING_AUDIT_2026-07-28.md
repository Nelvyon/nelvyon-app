# CTO — Auditoría definitiva de pendientes (v2 post Cursor-0€)

> **Fecha:** 2026-07-28 · **Versión:** 2 (Cursor 0€ vaciado)  
> **SSOT:** este archivo (no re-auditar desde cero sin cambio material)  
> **claimReady: false** · **NOT READY** · tip: ver HANDOVER tras commits Cursor-0€  
> **Regla:** solo pendientes reales · no % inventados

---

## Cursor al 100% · 0 €

**Vacío.** Todos los ítems Cursor-only de la v1 (2026-07-28) están **CLOSED** con evidencia en código/tests/docs, o **reclasificados** abajo cuando resultaron imposibles sin ops/Railway.

### Cerrado (evidencia)

| Ítem | Evidencia |
|------|-----------|
| Commit Lote A + Cursor-0€ batch | git tip en HANDOVER |
| Sync TODO / KNOWN_ISSUES / ChatGPT brief i18n | docs actualizados |
| A/B `+ Nuevo test` | `ab-testing/page.tsx` modal → POST API |
| Facturas draft + enviar | `facturas/page.tsx` POST/PATCH |
| Documentos Edit | `documentos/page.tsx` update modal |
| Sequence opened/clicked + tracking | mig **521** · `SaasSequencesService` · track routes |
| Enroll UX contact picker | `secuencias/page.tsx` |
| Playwright `saas-secuencias.spec.ts` | archivo añadido (Chromium local = ops install) |
| `twilio_configured` APIs + banners | campanias/workflows/sequences |
| SES preflight workflows | `SaasWorkflowService.dispatchEmail` |
| SES_REGION default `eu-west-1` | `sesClient.ts` |
| Comunidades reply/share | honest disabled (sin schema reply) |
| Lead scoring mojibake | fixed |
| Analytics fail-closed | no demo metrics |
| Funnel mock-funnel error | visible |
| ERP UI copy Postgres/API | 4 pages |
| Pause CTA honesty → Stripe portal | `CancelSubscriptionFlow` |
| Partner copy Connect/CEO gate | `PartnerCommissionFlow` |
| Portal approve/reject + feedback | page + API + 7 tests |
| Evidence email STALE headers | campaigns/sequences md |
| Workflows E2E nota | `WORKFLOWS_E2E_REVAL_PENDING.md` |
| Vitest focused | **73 PASS** (saasEnv/workflows/dispatch/sequences/portal/billing locale) |

### Reclasificados (ya no “Cursor 100%”)

| Pendiente | Motivo bloqueo | Nuevo bucket |
|-----------|----------------|--------------|
| Re-run live cert `saas.email.campaigns/sequences` | Requiere Railway SES + cron secrets; headers STALE puestos | **Ops / Daniel** |
| Re-run `saas.workflows` `wf.create` 500 | Unit POST 201 OK; HTTP live opaque 500 → logs Railway | **Ops / Daniel** (`WORKFLOWS_E2E_REVAL_PENDING.md`) |
| Playwright Chromium install + run | Spec existe; browser no instalado en entorno agente | **Ops local** `pnpm -C apps/web exec playwright install` |
| CRM “Inscribir en secuencia” deep CTA | Opcional; enroll picker en secuencias CLOSED; CRM CTA = scope extra | **Cursor P3 opcional** (no bloquea vaciado §1) |
| Comunidades reply anidado real | Sin `parent_post_id` en schema — añadir sería feature nueva | **CEO/producto** si se prioriza |
| Migrate **521** apply staging/prod | Código en repo; apply = deploy/migrate ops | **Ops** (Railway releaseCommand) |

---

## Pendientes que permanecen

### 1. Cursor 0€ — vacío

_(ninguno)_

### 2. Daniel / decisión / aprobación

- Decidir IA canary ON vs KILL ON
- RAG prod permanente vs prep-only
- OpenClaw / SM / MCP prod SÍ/NO
- Pepito + checklist campañas (bloquea claimReady)
- Ack ERP migrate policy / dual-write prod
- Partner payouts flag
- Ads spend budget + flag
- meta-ads beta vs OAuth live
- Industry/health packs
- Declarar claimReady (solo tras legal+evidencia)

### 3. Cuentas / proveedores / costes

- OAuth social/ads/apps reales
- Cuentas oficiales NELVYON
- Twilio / Meta WA / dialer / SMS
- GBP · Apollo · Semrush
- APK/iPhone/stores
- 2ª réplica / multi-región
- E-sign / IoT
- SES/Stripe smoke comercial live
- Mesh Tailscale si reopen canary
- Redis opcional · DNS custom domain
- **Ops:** reval email certs + workflows E2E + migrate 521 + playwright install

### 4. Mercado / clientes

- Primeros clientes pagando
- Retención / soporte / casos de éxito
- Evidencia competitiva real

---

## Tres respuestas

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dev técnicamente terminado? | **Casi en capa Cursor-0€** — §1 vacío. Queda apply mig 521 + revals ops + features producto opcionales. |
| ¿Lanzar a mercado? | **No** — legal + OAuth de lo vendido + clientes. |
| ¿Impide READY hoy? | claimReadyLegal · Pepito · mass-send BLOCKED_LEGAL · sin clientes · IA KILLED · integraciones live. |

---

## Próximo paso EXACTO

1. Ops: `migrate` 521 en staging → smoke sequences tracking.
2. Ops: reval workflows E2E + email certs (SES GRANTED).
3. CEO: Pepito/legal o canary — no fingir READY.
