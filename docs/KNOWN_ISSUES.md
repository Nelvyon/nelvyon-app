# KNOWN_ISSUES — Errores conocidos

> No eliminar hasta resolver. Mover a **Historial resuelto** con solución.

---

## Activos

### KI-031 — Staging Mesh Option A: Tailscale join FAIL (invalid TS_AUTHKEY)

| Campo | Valor |
|-------|-------|
| **Estado** | **Abierto 2026-07-23** |
| **Síntoma** | Logs: `tailscale up failed` / `invalid key` · peer `nelvyon-staging-web` offline · Pack E2E remoto BLOCKED |
| **Mitigación** | Ollama privado PASS · staging live/ready 200 · prod IA ABSENT · entrypoint no setea proxies si up falla (ADR-043) |
| **Rollback** | `NELVYON_AI_ENABLED=0` + `OLLAMA_CONFIGURED=0` (staging only) |
| **Acción CEO** | Regenerar auth key (`docs/ops/MESH_OPTION_A_STAGING.md`) · reemplazar `TS_AUTHKEY` · redeploy staging · esperar `MESH_JOIN_OK` |
| **Nota** | No declarar READY ni Pack E2E PASS hasta join OK. Sin secretos en git/chat. |

### Ops (no KI) — Web `git_sha` null after `railway up`

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto 2026-07-22** → historial |
| **Reparación** | ONE `railway redeploy --service "@nelvyon/web" --from-source -y` → deploy `7d625161` · live `git_sha=9ca0cf29a5e5` |
| **Nota** | claimReady remains **false** (legal + CEO IA). |

### Ops (no KI) — Staging pack E2E `LLM_NOT_CONFIGURED` / mesh

| Campo | Valor |
|-------|-------|
| **Estado** | **Superseded parcialmente por KI-031** — mesh flags ON pero join FAIL |
| **Detalle** | Tras `MESH_JOIN_OK` re-correr Pack E2E contra `ideal-victory-staging`. OpenAI sigue OFF. |
| **Evidencia** | `.release-logs/mesh-option-a-staging-verify-20260723.txt` |

### Ops (no KI) — Local pack as-complete con Ollama 3b

| Campo | Valor |
|-------|-------|
| **Estado** | **Observado** — no bloquea go-live DNS |
| **Severidad** | Baja (local QA quality) |
| **Detalle** | Kickoff HTTP local+Ollama completa pipeline en `needs_review` cuando artifacts 3b no alcanzan QA≥85. **Model/hardware limit** (threshold 85 unchanged; NOT false PASS). Phase C heliovolt 3b **qa=55**; 8b **qa=89** (evidence). OpenAI auto-fallback removed (`AUTONOMOUS_ALLOW_OPENAI` opt-in). |
| **Evidencia** | `.release-logs/hardening-ia-packs-20260722.txt` · run `c61cb100…` needs_review · 8b optional pass |

### KI-027 - Test drift brain knowledge (`ingestEvidence.verified`)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto 2026-07-21** |
| **Severidad** | Era Baja (P2) — mitigada |
| **Reparación** | Test `nelvyonBrainKnowledge.test.ts` ahora mirrors `knowledge_ingest_evidence.json` (`ok && verified`); conserva `claimComplete:false`. Validador post-elite → 508–516. |
| **Evidencia** | Brain tests 7/7 PASS · `nelvyon-verify-all` → **CONDITIONAL_READY** (0 FAIL) · `validate-post-elite-migrations` OK 508–516 |
| **Nota** | No se debilitó cobertura; `claimComplete` sigue tipado `false`. |

### KI-020 - CSRF Origin en mutaciones cookie SaaS (mitigado en codigo)

| Campo | Valor |
|-------|-------|
| **Estado** | Mitigado en repo · smoke staging apex PASS · app Origin allowlist fix 2026-07-22 (`assertSaasOrigin` + `staging-smoke-ki020-csrf.mjs`) |
| **Severidad** | Alta (antes); controlada tras fix |
| **Detalle** | Mutaciones `/api/saas/*` con cookie sin Origin/Referer validos -> 403 via `assertSaasOrigin`. Fallback SES bounce/complaint ahora exige `tenant_id`. |
| **Docs** | `docs/CIERRE_FINAL_PRIORITARIO.md` |

### KI-022 - Staging schema drift: legacy `conversations` (integer) vs mig 401 (UUID)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-20** (histórico activo para referencia) |
| **Severidad** | Era Alta — mitigada |
| **Reparación** | Mig `400a_reconcile_legacy_integer_conversations.sql` (rename legacy vacío) → `401` aplicada. Postcheck: `conversations.id` uuid · `conversation_messages` FK OK · legacy 0 filas. |
| **Evidencia** | Staging `_migrations` contiene `400a_*` + `401_inbox_conversations.sql`. Backup local fuera de repo. |
| **Nota** | No se editó 401. Producción no tocada. |

### KI-023 - Staging migrate bloqueado en `402_pipeline_deals.sql` (tenant_id)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-20** |
| **Severidad** | Era Alta — mitigada |
| **Reparación** | Mig `401a_reconcile_legacy_integer_deals.sql` (idempotencia UUID+tenant_id antes de abort destino; check seq `deals_legacy_integer_id_seq`) → `402`…`407` OK. Postcheck: `deals.id` uuid + `tenant_id` · pipelines/stages+FKs · legacy 0 filas. |
| **Evidencia** | Staging `_migrations` contiene `401a_*` + `402_pipeline_deals.sql` … `407_*`. Backup local fuera de repo. |
| **Nota** | No se editó 402. Producción no tocada. Cadena continuó hasta **FATAL @408** → KI-024. |

### KI-024 - Staging migrate bloqueado en `408_calendar_events.sql` (tenant_id)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-20** |
| **Severidad** | Era Alta — mitigada |
| **Reparación** | Mig `407a_reconcile_legacy_integer_calendar_events.sql` (idempotencia UUID+tenant; check destino/seq) → `408`…`506` OK. **Nota:** nombre `407a` no `408a` porque sort lexicográfico tiene `408_*` < `408a_*`. |
| **Postcheck** | `calendar_events.id` uuid + `tenant_id` · `calendar_events_legacy_integer` 0 filas · `_migrations` 407a+408…506 · **507 ausente** |
| **Nota** | No se editó 408. Producción no tocada. Verify Shared Memory diferido. Stop siguiente = KI-025 @507. |

### KI-025 - Staging: mig 507 dual-schema + orden `current_tenant_id()` (audit)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-21** (cadena migrate + Shared Memory) |
| **Severidad** | Era Alta — mitigada para bloqueo 507 |
| **Reparación** | `506a_reconcile_legacy_pre_507_social_posts.sql` (rename vacío) → 507…515. **507 no editada** (prod ya la tiene). |
| **Postcheck** | `_migrations` 506a+507…515 · `social_posts` UUID+tenant_id int · legacy 0 · SM **verified:true** |
| **Residual** | Warnings 507 tolerados + policies tenant ausentes → **KI-026** |

### KI-026 - Staging: RLS policies tenant ausentes tras 507 (42883 / type drift)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-21** |
| **Severidad** | Era Media–Alta — mitigada (defensa en profundidad) |
| **Reparación** | Mig aditiva `516_fastapi_rls_repair.sql` (idempotente; no edita 507; no toca SM). **ADR-032** dual-plane. |
| **Postcheck** | 13 tablas RLS ON + policies · predicado funnels/chatbot aislamiento OK · SM `verified:true` · `_migrations` contiene 516 |
| **Nota** | Runtime SET ROLE no disponible en pooler/superuser; evidencia = catalog + predicados = expresiones de policy. Audit JWT skip si &lt;2 tenants onboarding. |

### KI-021 - Shared Memory 514/515 no aplicadas en staging

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-21** |
| **Detalle** | 514+515 en `_migrations` · tablas + RLS + policies SaaS · `verify-shared-memory-schema.mjs` → `verified:true` (`method: node-pg`) |
| **Nota** | Flags runtime Shared Memory **siguen OFF** por defecto; no activar en prod. |


### KI-018 — Fase 2 Elite: residuales post-PASS (ops remotas)

| Campo | Valor |
|-------|-------|
| **Estado** | Parcialmente mitigado 2026-07-20 (local) |
| **Severidad** | Controlada |
| **Detalle** | Elite/Workforce PASS intactos. **Local:** Docker+pgvector+ingest Brain **verified** (1559 chunks). Sigue pendiente ops remota: migrate **514/515** staging (KI-021), OpenClaw URL real. |
| **Docs** | `docs/PHASE2_ELITE_CERT.md` · ADR-026 · HANDOVER Bloque 1 |

### KI-016 — (histórico residual) Docker/pgvector LocalVectorStore

| Campo | Valor |
|-------|-------|
| **Estado** | Mitigado en local 2026-07-20 — ver KI-018 |
| **Detalle** | Compose local-ai UP + ingest verified; comparar entornos staging sigue ops |

### KI-012 — Vulnerabilidades npm high (transitive)

| Campo | Valor |
|-------|-------|
| **Severidad** | Media (dependencias) |
| **Detalle** | ~17 high en árbol pnpm tras overrides; 0 critical |
| **Mitigación** | Gate CI falla solo en critical; Dependabot semanal; overrides documentados ADR-012 |
| **Fix** | Actualizar deps upstream cuando patches disponibles; no exclusiones globales |

---

### KI-005 — Private AI: dual RAG stores (deuda controlada → facade)

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (mitigada) |
| **Detalle** | Facade `UnifiedRagStore` prefer LocalRagRetriever → fallback NelvyonRagStore. Router cert path sin cambios. |
| **Mitigación** | `NELVYON_RAG_PREFER_LOCAL=0` rollback · docs `PHASE2_RAG_UNIFIED.md` |
| **Fix** | Ingest vector local **verified** 2026-07-20 (1559 chunks). Cutover ops staging/prod RAG sigue aparte. |

---

### KI-009 — Railway SSH no configurado en entorno agente

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (ops) |
| **Detalle** | `railway ssh` requiere clave en `~/.ssh/` |
| **Fix** | `ssh-keygen -t ed25519` + `railway ssh keys add` |

---

## Historial resuelto

### Ops-R — Cloudflare DNS `app.nelvyon.com`

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-22** |
| **Evidencia** | Railway verified+cert VALID · live/ready 200 · `.release-logs/dns-app-verify-pass-20260722.txt` · `docs/ops/DNS_APP_NELVYON.md` |
| **Nota** | CNAME+TXT DNS-only en Cloudflare |

### KI-R028 — Stripe Live STARTER price (ex KI-028)

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-22** |
| **Evidencia** | `GET /api/billing/price-audit` (auth cron) en `nelvyon.com` + `nelvyonweb-production.up.railway.app` → **allValid=true** · starter/pro/agency `stripeRetrieveOk=true` · `stripeActive=true` · sin `resource_missing` |
| **Vars** | `STRIPE_PRICE_ID_STARTER` / `PRO` / `AGENCY` SET (`price_*`); `STRIPE_PRICE_ID_AGENCY_PARTNER` ausente (fuera del audit checkout; no bloquea KI-028) |
| **Nota** | Sin crear precios/cobros en esta pasada |

### KI-R030 — Runtime `security/headers` cwd apps/web (ex KI-030)

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-22** |
| **Causa** | `next.config` resolvía `./src/lib/security/headers` desde cwd `/app` |
| **Fix** | CMD `cd /app/apps/web && exec node server.js` · WORKDIR `/app` · `.dockerignore` WIP |
| **Deploy** | `3f08f13d` **SUCCESS** · SHA vivo `bba71f14afc1` · live/ready 200 · logs Ready sin headers error |
| **Evidencia** | Local docker PASS · vitest 3/3 · tsc 0 · `.release-logs/p0-smokes-post-ki030.txt` |

### KI-R029 — Prod migraciones 512–516 vía preDeployCommand (ex KI-029)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-21 |
| **Solución** | `/railway.toml` + `/railway.json`: `preDeployCommand = ["pnpm -C apps/web migrate:prod"]`; Dockerfile raíz copia `apps/web/scripts` + workspace + `WORKDIR /app` |
| **Evidencia** | Deploy `922c8039` logs `[migrate] run/done` 512…516 · `all migrations complete` · read-only `_migrations` `all512to516=true` (ejecutado ~2026-07-21T17:31:04Z) |
| **Nota** | App start del mismo deploy falló → **KI-030**; schema drift KI-029 **cerrado** |

### KI-R014 — AWS SES production access (ex KI-014)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-21 |
| **Solución** | AWS Review GRANTED · ProductionAccessEnabled true · SendingEnabled true · nelvyon.com Verification/DKIM SUCCESS · self-send OK · SNS webhook confirmed |
| **Evidencia** | Bloque 4 ejecución · `docs/OPS_SES_PROD.md` (actualizar checklist) |

### KI-R017 — Migraciones dollar-quote / CREATE IF NOT EXISTS (ex KI-017)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-19 (mitigado) |
| **Solución** | Splitter portado a `scripts/lib/splitSqlStatements.mjs` + `scripts/validate-split-sql.mjs`; migrate-pg usa el mismo port. Colisiones 406/415 corregidas; 507 consolidated skip. Residual: auditoría IF NOT EXISTS restante no bloquea fresh migrate. |

---

### KI-R016 — Docker Desktop local no disponible para E2E live (ex KI-016)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-17 |
| **Solución** | Engine UP; Postgres pgvector `:5433` + Redis `:6380`; live multi-tenant PASS · `PRODUCTION_CERTIFICATION_REPORT.md` · `live_multitenant_latest.json` |

---

### KI-R019 — Workforce cert CONDITIONAL → PASS (ex KI-019)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-19 |
| **Solución** | Residuals + live Ollama/RAG auto + soak + production build en `run-workforce-cert.mjs`; `verdict=PASS`; `nelvyonAutonomousWorkforceCertified=true`; skipped=0; force-pass rechazado. Evidencia: `workforce_certification.json`, `workforce_live.json`, `workforce_soak.json` |

---

### KI-R015 — Lead scoring legacy `scored_leads` / `LeadScoringService` (ex KI-015)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-17 |
| **Solución** | Eliminada clase `LeadScoringService`; mig `513_drop_scored_leads.sql`; HTTP `/leads` permanece 410; SSOT = `SaasLeadScoringService` |

---

### KI-R012 — Restore drill Postgres (DR) sin evidencia

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-17 |
| **Solución** | `scripts/run-postgres-restore-drill.mjs` — pg_dump → pg_restore ephemeral · **8/8 PASS** · `postgres_restore_drill_latest.json` |

---

### KI-R011 — SES dominio nelvyon.com (ex KI-013)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-11 (ops) / docs sync 2026-07-17 |
| **Evidencia** | `CEO_FINAL_ACTIONS.md` — VerificationStatus SUCCESS, DKIM SUCCESS |

---

### KI-R010 — SNS SES subscription (ex KI-011)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-10 |
| **Evidencia** | Topic `nelvyon-ses-events` confirmado · `CEO_FINAL_ACTIONS.md` |

---

### KI-R009 — Status page probes externos fallaban

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-10 |
| **Causa** | statusChecker usaba URLs AWS/Stripe incorrectas; DB no usaba health checks reales |
| **Solución** | Probes internos + checkDatabase/checkStripe/checkSES; cron status-check en GH Actions |

---

### KI-R008 — Staging Elite Gate fallaba por deploy SHA timeout

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-10 |
| **Causa** | Railway no rebuild en pushes scripts-only; gate esperaba SHA indefinidamente |
| **Solución** | `DEPLOY_WAIT_SOFT` + timeout 10m; local-pack-e2e alineado con ecommerce smokes |

---

### KI-R005 — CI pack tests fallaban (packSeedMetadata, packAutoApprove)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Causa** | Mock `createPackRun` sin `{ run, created: true }` → early return en orchestrator |
| **Solución** | Corregidos mocks en tests pack |

---

### KI-R006 — releaseCommand no aplicaba migraciones

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Solución** | `migrate:prod` unificado + Dockerfile copia `scripts/` |

---

### KI-R007 — Setup dev local sin commit

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Solución** | Commiteado `config.py`, `load_env_files.py`, README dev |

---

### KI-R004 — CEO brief 42P01 + schema_not_ready

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 17:02 UTC |
| **Solución** | Migrate prod 482–511; cron `processed:1` |

---

## Plantilla nuevo issue

```markdown
### KI-XXX — Título
| Campo | Valor |
| Severidad | |
| Ruta / servicio | |
| Causa | |
| Fix | |
| Estado | |
```
