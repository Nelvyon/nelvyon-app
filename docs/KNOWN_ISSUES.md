# KNOWN_ISSUES — Errores conocidos

> No eliminar hasta resolver. Mover a **Historial resuelto** con solución.

---

## Activos

### Historial — wf.create Internal 500 (localhost 2026-07-17) → CLOSED_STAGING 2026-07-28

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging** · payload cert manual+active **201** · score_threshold fixed via mig 522 |
| **Detalle** | Fail histórico opaque Internal error en localhost; reval staging CERTIFIED. Prod mig 522 pendiente CEO. |
| **Evidencia** | `WORKFLOWS_E2E_REVAL_PENDING.md` · `saas.workflows_latest.json` |

### Ops (no KI) — Prod private AI canary inference DB (ADR-068/069)

| Campo | Valor |
|-------|-------|
| **Estado** | **PREPARED** schema/RLS · canary **PREPARED_OFF** · CEO SÍ/NO pending |
| **Detalle** | Option A: `local_ai_*` + role RLS en prod DB · `LOCAL_AI_DATABASE_URL` SET · KILL ON · AI off. Apertura solo tras `CEO_PROD_CANARY_OPEN_YN.md`. |
| **Evidencia** | `railway.rag_prod_option_a_prep_latest.md` · `CEO_PROD_CANARY_OPEN_YN.md` |

### Ops (no KI) — Puntos 1–4 CEO batch (ADR-066 → ADR-067)

| Campo | Valor |
|-------|-------|
| **Estado** | **CEO_DECIDED** · #1 SÍ (política) · #2–#4 staging verified / prod canary attempted fail-closed |
| **Detalle** | Gate migrate fail-closed **CEO-ACK**. ADR-068: dual-write+RAG staging verified; prod canary mesh OK but inference blocked on local-AI DB default. |
| **Evidencia** | `CEO_POINTS_1_4_APPROVAL_REQUEST.md` · `private-ai.prod_canary_adr068_latest.md` |

### Ops (no KI) — Prod migrate gate ADR-064 (histórico 519/520 kept)

| Campo | Valor |
|-------|-------|
| **Estado** | **Mitigado VERIFIED** — tip `c2edb2da` · prod skip-apply · `migrate.ts` también gated · 519/520 **no revertidas** |
| **Detalle** | Gate: `NELVYON_PROD_MIGRATE_APPROVED=1` + `APPROVED_BY`; pending sin approval → deploy/`pnpm migrate` fail. Staging auto-migrate intacto. |
| **Evidencia** | `prodMigrateGate.ts` · `migrate.ts` · vitest · staging `da6b7a74` · prod `a82b55ac` · `prod.migrate_gate_latest.md` · ADR-064 |
| **Pendiente CEO** | Ack histórico + no dejar vars approval permanentes en prod |

### Ops (no KI) — Email + PDF locale PARTIAL (no FULL_VERIFIED)

| Campo | Valor |
|-------|-------|
| **Estado** | **Abierto** — **PARTIAL** |
| **Detalle** | UI catalogs es/en/fr/de/it/pt **FULL**. Email transactional SES+billing lifecycle **LOCALIZED** (Lote A 2026-07-28). PDF labels chrome LOCALIZED; **legal/tax body HUMAN_REVIEW**. No FULL_VERIFIED email/PDF sin revisión legal. Inventario: `docs/ops/EMAIL_PDF_LOCALE_PARTIAL.md`. |

### Ops (no KI) — Android APK build SDK pending

| Campo | Valor |
|-------|-------|
| **Estado** | **Mitigado local** · release APK **1.0.0** built + emulator smoke PASS · Play publish **BLOCKED_EXTERNAL** |
| **Detalle** | Evidence `mobile.android_release_latest.md` · emulator `mobile.android_emulator_phase3_2026-07-30.md` · sideload keystore local ≠ Play App Signing · FCM/OEM físico pendiente |
| **Checklist** | `MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md` |

### Ops (no KI) — ADR-057 external integrations pending CEO

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_EXTERNAL** / **BLOCKED_CEO** |
| **Detalle** | Cores internos verified · rutas externas pendientes: Twilio real (Block 11) · OAuth apps reales (Block 16) · ads spend/OAuth (Block 13) · social publish (Block 14) · App Store/Play + APK SDK (Block 18) · multi-region **COST** (Block 21) · IA prod canary (Block 25 · `CEO_IA_PROD_CANARY_REQUEST.md`) — pgvector Docker live (Block 24) **resuelto 2026-07-25**, Railway **PREPARED_OFF** |

### Ops (no KI) — Legal checklist campañas + Datos Pepito (claimReady)

| Campo | Valor |
|-------|-------|
| **Estado** | **Abierto** — **BLOCKED_LEGAL** claimReady / READY |
| **Detalle** | Gate reforzado ADR-055/056/057 · Block 15 mass-send controls verified · `claimReadyLegal` hard-false · send **BLOCKED_LEGAL** · `DATOS_PEPITO_LICENSE_DOSSIER.md` · Pepito **forbidden** · falta confirmación escrita + licencia comercial |

### Ops (no KI) — Ads OAuth spend path

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_EXTERNAL** |
| **Detalle** | Block 13 core **IMPLEMENTED_VERIFIED** · no live Meta/Google/LinkedIn OAuth spend path · `NELVYON_ADS_SPEND_ENABLED=0` · `ADS_OAUTH_SPEND_CEO_CHECKLIST.md` |

### Ops (no KI) — Social oficial NELVYON

| Campo | Valor |
|-------|-------|
| **Estado** | **PREPARED_OFF** |
| **Detalle** | `NelvyonOfficialSocialOps` + `NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md` · 8 cuentas **PENDING_CEO** · sin publish/OAuth |

### Ops (no KI) — Private AI prod canary (Block 25)

| Campo | Valor |
|-------|-------|
| **Estado** | **PREPARED_OFF** · **BLOCKED_CEO** |
| **Detalle** | `PrivateAiCanaryPrep` checklist verified · `isProductionCanaryAuthorized()` hardcoded **false** · `CEO_IA_PROD_CANARY_REQUEST.md` **PENDING_CEO** |

### Ops (no KI) — OpenClaw prod canary

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_CEO** |
| **Detalle** | Staging_mock CERT · `CEO_OPENCLAW_PROD_CANARY_REQUEST.md` **PENDING_CEO** · prod requiere nueva auth CEO |

### Ops (no KI) — Private AI prod canary mesh (ADR-068)

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_EXTERNAL** |
| **Detalle** | CEO authorized code ack + gates on tip `428c6c91`. Prod live `d03721c1` sin tip canary; `TS_AUTHKEY`/`OLLAMA_HOST` **ABSENT**. Canary **not** activated (no degraded prod). |
| **Evidencia** | `private-ai.prod_canary_adr068_latest.md` |

### Ops (no KI) — Railway pgvector staging ACTIVATED (ADR-068) · prod DDL OFF

> Histórico PREPARED_OFF supersedido en staging 2026-07-26. Prod DDL sigue OFF.

### Ops (no KI) — Railway pgvector extension VERIFIED · Private RAG path PREPARED_OFF (histórico)

| Campo | Valor |
|-------|-------|
| **Estado** | Extension **INSTALLED** (vector 0.8.0) on staging · Private RAG path **PREPARED_OFF** |
| **Detalle** | Probe 2026-07-25: `local_ai_rag_*` ausente · `nelvyon_rag_chunks`/`saas_tenant_memory_chunks` sin columna vector · `LOCAL_AI_DATABASE_URL` ABSENT · Ollama env SET · Docker RAG path intacto VERIFIED |
| **Evidencia** | `railway.pgvector_probe_latest.md` |
| **Pendiente** | CEO/Daniel: migrate `local_ai_rag_*` en staging o DB dedicada + wiring |

### Ops (no KI) — 2ª réplica Railway BLOCKED_EXTERNAL/COST

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_EXTERNAL/COST** — no activada (`numReplicas=1`) |
| **Evidencia** | `ha.replica_cost_block_latest.md` · equivalencia: ERP concurrency ALL_PASS |

### Ops (no KI) — pgvector RAG en staging (histórico · supersedido por probe extension)

| Campo | Valor |
|-------|-------|
| **Estado** | **PREPARED_OFF** (staging path) — ver Ops Railway pgvector arriba |
| **Detalle** | Verificación EN VIVO de pgvector RAG (2026-07-25) se hizo contra Docker+Ollama de la máquina local del owner, no contra Railway staging. Extender a staging requeriría: (1) instancia Postgres+pgvector alcanzable desde el servicio de Railway staging (`LOCAL_AI_DATABASE_URL`) — no provisionada; (2) `OLLAMA_HOST` mesh (Tailscale) desde staging al Ollama del owner — ya documentado como **pendiente CEO separado** en `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md`. Ninguno de los dos se activó ni se solicitó en esta sesión. |

---

## Historial resuelto (reciente)

### KI — pgvector RAG: minScore=0.32 no refusa en corpus de tenant muy pequeño (P2) → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-27** |
| **Fix** | `resolveEffectiveRagMinScore` en `LocalRagRetriever.ts` — suelo **0.45** si `0 < activeChunkCount < 48`; corpus grande conserva **0.32** (nunca se bajó el default) |
| **Evidencia** | `pgvector-rag.live_latest.md` **VERDICT PASS** (críticos+calidad) · `localRagMinScoreFloor.test.ts` · load 8× PASS · calibración staging related~0.63 / unrelated~0.37 |
| **Nota** | Sin mocks · sin umbrales bajados · canary prod **no** abierto · `claimReady: false` |

### Ops-R — ERP process-memory as SSOT / loss-on-restart (P0 design risk) → ADR-061

| Campo | Valor |
|-------|-------|
| **Resuelto (código)** | **2026-07-25** — ADR-061 |
| **Causa** | ADR-060: ERP Blocks 26–29 runtime SSOT was process-local in-memory → data lost on process restart |
| **Fix** | Mig **520** `erp_domain_snapshots` + RLS · `ErpDomainSnapshotStore` · API routes → `with*Persistence` · when `DATABASE_URL` set, **Postgres is SSOT** (process-memory no longer SSOT) · mig **519** remains companion schema reserved |
| **Evidencia** | `520_erp_postgres_persistence.sql` · `ErpPersistentRuntime` · API erp routes · vitest roundtrip · OsCatalogV1 nextAction · living docs ADR-061 |
| **Nota** | Staging survival **VERIFIED** 2026-07-25 (`9e931f08` · `794662d7`). Prod ERP migrate still gated. `claimReady: false`. |

### Ops — pgvector RAG live e2e (Block 24 "yellow point 7") — Docker+Ollama real, aislamiento app+RLS verificado

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-25 (verificado EN VIVO en máquina local del owner) |
| **Evidencia** | `scripts/staging-smoke-pgvector-rag-e2e.mjs` → `scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md` — 11/13 checks críticos+calidad PASS, 2 quality FAIL documentados (ver KI arriba) · Docker `nelvyon-local-ai-postgres` (pgvector/pgvector:pg16) healthy · Ollama `nomic-embed-text` reachable · `backend/agency/__tests__/PrivateVectorRagCore.test.ts` 27 PASS · `tsc --noEmit` 0 errores |
| **Nota** | `PrivateVectorRagCore.PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath` promovido de `PREPARED_OFF` → `IMPLEMENTED_VERIFIED` con evidencia + timestamp + gap conocido documentado (nunca oculto) · `OsCatalogV1` `private_vector_rag.nextAction` actualizado · staging sigue **PREPARED_OFF** (ver Ops arriba) |

### Ops — ADR-057 Blocks 11–25 internal cores (local · deploy pending)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 (código local verificado) |
| **Evidencia** | `tsc` **0** · `backend/agency` **249 PASS** · influencers pack **PASS** · `pwa-certify` **PASS** · private-rag synthetic **ALL_PASS** (27 tests) · catalog **v1.4.0** |
| **Nota** | tip **TBA** · staging deploy **pending push** · externos siguen **BLOCKED** |

### Ops — ADR-056 P0/P1 audit fixes (local · deploy pending)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 (código local) |
| **Evidencia** | base tip **`6364c28c`** · tsc **0** · agency **109 PASS** · CampaignsLegal+saasCampanias+saasEnv+mcpProductive+catalog availability **PASS** · eslint changed routes **0** |
| **Nota** | Fixes **uncommitted** · tip TBA · staging runtime still ADR-055 `53149384` |

### Ops — ADR-055 E2E PASS (automations/reputation + SM/MCP synthetic)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Evidencia** | tip **`53149384`** · deploy **`e514bbd7`** SUCCESS · `automations_reputation_e2e_latest.md` · SM/MCP synthetic flags ON · productivo 0 |

### Ops — ADR-055 local CODE_READY (deploy pending)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 (código local) |
| **Evidencia** | agency **64+ PASS** · tsc **0** · catalog **1.2.0** · tip **TBA** |
| **Nota** | E2E automations/reputation + staging deploy **pending** |

### Ops — ADR-054 11 packs + auditor ALL_PASS

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Evidencia** | tip `980ea216` · deploy `23f637b9` · `auditor.all_packs_e2e_latest.md` |

### Ops — ADR-053 OS v1 staging closure

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Evidencia** | tip `37b8bd42` · deploy `dd7505e9` |

### Ops — Social ADR-052 staging CERT

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Evidencia** | E2E `--only=social` ALL_PASS · tip `4d331b55` · deploy `85fe50cc` · 7 entregables portal |
| **Nota** | Login 401 corregido resync `STAGING_QA_PASSWORD` + `seedQaOperator` (staging only) |

### Ops — 5 packs beta → ALL_PASS / available

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto** 2026-07-24 |
| **Detalle** | `.release-logs/beta-packs-e2e-2026-07-24T13-42-38.txt` · tip `eb462545` |

### Ops — Strategy/Funnel/Retention E2E post-deploy

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto** 2026-07-24 |
| **Detalle** | `ecommerce-pack-e2e-20260724-015452` · `saas-b2b-pack-e2e-20260724-022752` · registry elite ecommerce+crm_sales |

### Ops — Staging mesh Pack E2E QA soft-fail → ALL_PASS

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Detalle** | tip `99b30730` · ADR-046 · Pack E2E **completed** · 5 auto-approve · supersede `needs_review` `f5de9c43` |

### Ops — Prod residual `OPENAI_API_KEY`

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Detalle** | Variable eliminada · **ABSENT** · `AUTONOMOUS_ALLOW_OPENAI` ABSENT |

---

## Historial resuelto

### KI-031 — Staging Mesh Option A: Tailscale join FAIL (invalid/consumed TS_AUTHKEY)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-23 |
| **Causa** | Auth key ephemeral consumida en redeploys |
| **Solución** | `TS_AUTHKEY` reusable+ephemeral · `MESH_JOIN_OK` · peer `nelvyon-staging-web-1` active · deploy `6aeb4106` |

### Ops (no KI) — Web `git_sha` null after `railway up`

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto 2026-07-22** → historial |
| **Reparación** | ONE `railway redeploy --service "@nelvyon/web" --from-source -y` → deploy `7d625161` · live `git_sha=9ca0cf29a5e5` |
| **Nota** | claimReady remains **false** (legal + CEO IA). |

### Ops (no KI) — Staging pack E2E `LLM_NOT_CONFIGURED` / mesh

| Campo | Valor |
|-------|-------|
| **Estado** | **Superseded parcialmente por KI-031** — tip `1d5d620a` Pack E2E **WARN** critical=0 sin `MESH_JOIN_OK` (no declara mesh path) |
| **Detalle** | Tras `MESH_JOIN_OK` re-correr Pack E2E + probe Ollama vía proxy. OpenAI sigue OFF. |
| **Evidencia** | deploy `03a16532` · HANDOVER 2026-07-23 |

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
