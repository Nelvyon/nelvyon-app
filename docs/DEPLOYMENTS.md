# DEPLOYMENTS — Historial

> Actualizado: **2026-08-03** tip prod `f3c01c54` · deploy `32f7c8ac` SUCCESS · raíz `/` = AIOR 200 · canary KILL · `claimReady: false`.

## 2026-08-03 — Root `/` AIOR 200 rewrite (production)

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `f3c01c54fe008af7fe6b86bc2f84a099f37fe77f` |
| **Env** | Railway production `@nelvyon/web` · https://nelvyon.com · https://app.nelvyon.com |
| **Deploy** | `32f7c8ac-fa11-477b-bc71-8de1678a88db` **SUCCESS** |
| **Prev tip** | `92b2b462` / `df882d11` (AIOR en `/www` OK; raíz era 307+RSC) |
| **Health** | `git_sha=f3c01c54fe00` |
| **Smokes** | `/` y `app/` → **200** AIOR (`preloader`, hero, `base=/www/`, saas-shots=0, sin `_next`) |
| **Causa** | `redirect()` Next devolvía 307 + cuerpo RSC marketing |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## 2026-08-02 — Public web AIOR visual restore (production)

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `92b2b462742022616a2266cf6987124973969b95` |
| **Env** | Railway production `@nelvyon/web` · https://nelvyon.com · https://app.nelvyon.com |
| **Deploy** | `df882d11-87b2-4c4b-9355-0ad0d4d85f70` **SUCCESS** |
| **Prev tip** | `4e78f600` / deploy `61cb5010` (llevaba media SaaS — **sustituido**) |
| **Health** | `/api/health/live` **200** `{"ok":true,"git_sha":"92b2b4627420"}` (nelvyon.com + app) |
| **Smokes** | 36/36 HTML sin saas-shots · `assets/img/nelvyon/*` **404** · `style.css` `--theme-color:#7B5DFF` · hero/about byte-match AIOR · form `/api/contact` · `main.js` 200 |
| **Regla** | Solo logos + copy NELVYON; CSS/JS/img AIOR originales |
| **claimReady** | **false** (CEO visual + URLs definitivas) |
| **Canary** | **KILL ON** |

## 2026-08-02 — Public web AIOR→NELVYON `/www` (production) — supersedido

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `4e78f6007f845d28a4e1c340fc45bbb1f6dbecf0` |
| **Env** | Railway production `@nelvyon/web` · https://nelvyon.com · https://app.nelvyon.com |
| **Deploy** | `61cb5010-c5cb-4184-bbc2-665e57631969` **SUCCESS** (media SaaS — reemplazado por `df882d11`) |
| **Prev tip** | `f89a498d` (React polish; `/www` **404** — pack no estaba en origin) |
| **Health** | `/api/health/live` **200** `{"ok":true,"git_sha":"4e78f6007f84"}` (nelvyon.com + app) |
| **Smokes** | `/` `agencia` `producto` `producto/ia` `enterprise` `precios` `contacto` → **307** a `/www/*.html` · HTML/CSS/JS/logo/favicon **200** · contacto form ES · sin Angfuztheme |
| **Bloqueo resuelto** | Deploy `5efee2c2` **FAILED** (imports `AiorPageHero`/`AiorBlocks` huérfanos) → fix commit `4e78f600` |
| **claimReady** | **false** (CEO visual + URLs definitivas) |
| **Canary** | **KILL ON** |

## 2026-07-30 — Fase 1 producción (migrate 521–522 + deploy)

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `3f10c272` (incluye ops `0d7d6e90`) |
| **Env** | Railway production `@nelvyon/web` · https://nelvyon.com |
| **Migrate** | **521+522 APPLIED** · ADR-064 `approved_by=Daniel` · pin `0d7d6e90` |
| **Deploy** | `3d76918b` **SUCCESS** · live sha `3f10c2729502` |
| **Smokes** | health/ready **200** · KI020 **PASS** · workflows **14/14 CERTIFIED** · sequences **8/8** · CRM **16/16 CERTIFIED** · score_threshold **201** |
| **IA** | canary **KILL ON** · AI=0 · OpenAI=0 · logs `PRIVATE_AI_CANARY_BLOCKED` (esperado) |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## 2026-07-29 — Orchestrator BFF + CSRF staging tip live

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `9bbd5808` |
| **Env** | Railway staging `ideal-victory` |
| **Deploy** | `06520aab` **SUCCESS** · live sha `9bbd5808376b` |
| **Smokes** | KI-020 CSRF **PASS** · health/live ok · orchestrator status **401** (auth required, no 404) |
| **Prod** | **NOT** migrated · **NOT** deployed |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## 2026-07-29 — Absolute closure tip live on staging

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `bf1d44f4` (security + LMS + webhook + Playwright cert) |
| **Env** | Railway staging `ideal-victory` |
| **Deploy** | `7ec98f42` **SUCCESS** · live sha `bf1d44f4eb65` |
| **Health** | `/api/health` ok · `/api/health/live` ok |
| **Prod** | **NOT** migrated · **NOT** deployed |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## 2026-07-29 — Excellence WIP push + staging validate

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `b236bba0` (4 commits: security · CRM/queue · UX · docs) |
| **Env** | Railway staging `ideal-victory` |
| **Deploy** | `073949a1` **SUCCESS** · live sha `b236bba0e12d` |
| **Smokes** | health/ready · workflows CERTIFIED 14/14 · seq 8/8 · honesty 12/12 · CRM export/import · artifact 400 · webhook idempotency · rate-limit 429 |
| **Prod** | **NOT** migrated · **NOT** deployed |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## 2026-07-28 — Push + staging deploy + SES align (v3.2)


| Campo | Valor |
|-------|-------|
| **Tip remoto** | `40099898` (9 commits pushed) |
| **Env** | Railway staging `ideal-victory` |
| **Deploy** | `56df6a6e` **SUCCESS** (redeploy `--from-source`; prior `9d080bd1` removed by accidental `railway down` during cancel of dirty BUILDING `9a1edd54`) |
| **SES** | `SES_REGION=eu-west-1` · AWS ProductionAccess true · identity `nelvyon.com` · **no send** |
| **Mig** | 521+522 still registered · migrate **skip** both · CHECK `score_threshold` OK |
| **HTTP** | health 200 · workflows CERTIFIED 14/14 · honesty 12/12 · seq smoke 8/8 · yellow EXIT 0 |
| **Playwright** | `saas-secuencias` **5 PASS** |
| **Prod** | **NOT migrated** · canary **KILL ON** |
| **claimReady** | **false** |

## 2026-07-28 — Staging migrate 521+522 (no prod · no push)

| Campo | Valor |
|-------|-------|
| **Env** | Railway **staging** shared Supabase (`ideal-victory` + `comfortable-empathy`) |
| **Applied** | `521_saas_sequence_enrollment_tracking.sql` · `522_saas_workflows_score_threshold_trigger.sql` |
| **Prod** | **NOT applied** (ADR-064 gate) |
| **HTTP** | `saas.workflows` **CERTIFIED** · honesty 12/12 · canary flags prod reconfirmed KILL |
| **Playwright** | Chromium install + `saas-secuencias` **5 PASS** (local) |
| **claimReady** | **false** |
| **Push** | **deferred** |

## 2026-07-27 — Private AI canary retry PASS (then KILLED)

| Campo | Valor |
|-------|-------|
| **Tip** | `8c5c2768` |
| **Deploys** | `5ef3b8d8` (fix) · `8f348e61` (canary window) |
| **HTTP smoke** | **ALL_PASS** (inference 4.7s · audit · A/B) |
| **RAG prod** | **PASS** (`pgvector-rag.prod_canary_latest.md`) |
| **Kill drill** | **PASS** ~1.53s |
| **Steady** | KILL=1 · AI/canary/OLLAMA_CONFIGURED=0 · OpenAI ABSENT |
| **Evidencia** | `private-ai.prod_canary_retry_pass_latest.md` |
| **claimReady** | **false** |

## 2026-07-27 — ADR-069 Option A prod RAG prep (canary OFF)

| Campo | Valor |
|-------|-------|
| **Staging** | e2e RAG **PASS** (críticos+calidad) · load 8× PASS |
| **Prod DDL** | `local_ai_*` + pgvector 0.8.3 · RLS FORCE · role `nelvyon_local_ai_app` |
| **Prod URL** | `LOCAL_AI_DATABASE_URL` SET (RLS role) · USE_MAIN_DB ABSENT |
| **Canary/AI** | KILL=1 · AI=0 · canary=0 · OLLAMA_CONFIGURED=0 · OpenAI ABSENT |
| **Evidencia** | `railway.rag_prod_option_a_prep_latest.md` · `railway.rag_prod_prep_latest.md` · `pgvector-rag.live_latest.md` |
| **CEO next** | SÍ/NO `CEO_PROD_CANARY_OPEN_YN.md` |
| **claimReady** | **false** |

## 2026-07-27 — ADR-069 fail-closed localhost RAG (no canary)

| Campo | Valor |
|-------|-------|
| **Cambio** | Código: prod nunca usa `127.0.0.1:5434`/loopback; schema ausente → `PRIVATE_AI_RAG_BLOCKED` |
| **Flags prod** | **sin cambio** — KILL=1 · AI/canary off · OpenAI ABSENT · USE_MAIN_DB ABSENT |
| **DDL prod** | **no** |
| **Evidencia** | `private-ai.adr069_failclosed_latest.md` · `CEO_PROD_RAG_DB_OPTIONS.md` |
| **claimReady** | **false** |

## 2026-07-26 — ADR-068 prod private AI canary attempt (killed)

| Campo | Valor |
|-------|-------|
| **Código tip** | **`1eaed9f2`** (`.dockerignore` includes private-ai inference/router-health/metrics) |
| **Prior tip** | `8856d5dc` (routes present in git but excluded from image) · `5064f1c1` mesh Dockerfile |
| **Canary deploy** | `f778bed9` SUCCESS · `MESH_JOIN_OK` · tip live `1eaed9f2` |
| **Smoke** | **FAIL** inference `ECONNREFUSED 127.0.0.1:5434` · route 3B PASS · status/isolation PASS |
| **Kill** | vars ~**1.27s** · deploy `ff843eae` SUCCESS · KILL=1 · AI/canary/OLLAMA_CONFIGURED=0 |
| **Steady flags** | OpenAI ABSENT · ALLOW=0 · mesh Option A retained · no MCP/SM/OpenClaw |
| **Evidencia** | `private-ai.prod_canary_adr068_latest.md` · `private-ai.prod_canary_smoke_latest.md` · `private-ai.prod_canary_kill_dockerignore_latest.md` |
| **claimReady** | **false** · **NOT READY** |
| **Coste** | **0** |

## 2026-07-26 — ADR-068 close puntos 2–4 (staging activate · prod canary stopped)

| Campo | Valor |
|-------|-------|
| **Código tip** | **`428c6c91`** (`ErpRelationalMirror` · RAG USE_MAIN_DB · canary gates) |
| **Staging live** | **`428c6c913c4d`** · deploy SUCCESS `3e6adef5` (+ queued builds) |
| **Staging flags** | `NELVYON_ERP_RELATIONAL_DUAL_WRITE=1` · `READ=0` · `NELVYON_LOCAL_AI_USE_MAIN_DB=1` · `AUTONOMOUS_ALLOW_OPENAI=0` |
| **RAG schema** | `local_ai_*` + role `nelvyon_local_ai_app` on **existing** staging DB · **no** new DB · **no** prod DDL |
| **Prod live** | **`d03721c19916`** · canary **not** enabled · IA flags **ABSENT** · dual-write **ABSENT** |
| **Evidencia** | `erp.dual_write_adr068_latest.md` · `railway.rag_staging_activated_latest.md` · `private-ai.prod_canary_adr068_latest.md` |
| **claimReady** | **false** |
| **Coste** | **0** |

## 2026-07-26 — ADR-067 CEO 1 SÍ / 2–4 NO (sin activar)

| Campo | Valor |
|-------|-------|
| **Decisión** | Gate migrate **CEO-ACK** · dual-write/RAG/canary **NO** |
| **Staging live** | `738f8200` |
| **Prod live** | `d03721c1` |
| **Ejecutado** | Docs + regresión soft-flag · **no** migrate · **no** DDL · **no** flags |
| **claimReady** | **false** |

## 2026-07-26 — PUNTOS 1–4 PREP COMMITTED (sin activar)

| Campo | Valor |
|-------|-------|
| **Repo tip** | **`43d7c3db`** · docs/classify/evidence only |
| **Live staging/prod** | tip **`d03721c1`** (sin flags productivos; docs deploy puede SKIP) |
| **Evidencia** | `points_1_4_prep_latest.md` · ERP reval ALL_PASS · apply schema **no** · canary **no** · migrate prod **no** |
| **CEO** | ADR-067 decidido (1 SÍ / 2–4 NO) |
| **claimReady** | **false** |

## 2026-07-26 — CIERRE TOTAL Cursor

| Campo | Valor |
|-------|-------|
| **Staging/Prod tip** | **`d03721c1`** · staging deploy **`d0393675` SUCCESS** |
| **Artefactos** | RAG prep runbook · android-one-step · CEO master actions · email PARTIAL inventory |
| **claimReady** | **false** |

## 2026-07-25 — CIERRE puntos 1–7

| Campo | Valor |
|-------|-------|
| **Staging** | deploy **`f0d3c57c` SUCCESS** · tip **`e5cb8c85`** · live+ready OK |
| **Prod** | tip **`0a253c7f`** (read-only this batch) |
| **Evidencias** | `railway.pgvector_probe_latest.md` · `ha.replica_cost_block_latest.md` · `mobile.android_device_smoke_latest.md` · `pwa.cert_latest.md` |
| **claimReady** | **false** |

## 2026-07-25 — CIERRE INTERNO ABSOLUTO (audit + harden)

| Campo | Valor |
|-------|-------|
| **Código** | `migrate.ts` gated · i18n saas shell · mobile SSOT docs |
| **Gates** | tsc 0 · vitest 63 PASS (gate+i18n) · anti-mock PASS · ERP A/B+conc ALL_PASS |
| **Staging/Prod tip** | `c2edb2da` (docs deploy pending tip push) |
| **claimReady** | **false** |

## 2026-07-25 — ADR-064 VERIFIED live (staging + prod)

| Campo | Valor |
|-------|-------|
| **Tip** | **`c2edb2da`** |
| **Staging** | `ideal-victory` deploy **`da6b7a74` SUCCESS** · live/ready OK · logs: `isProduction=false` · apply allowed · 519/520 skip |
| **Prod** | `@nelvyon/web` deploy **`a82b55ac` SUCCESS** · live/ready OK · logs: `isProduction=true` · `pending_count=0` · **skip apply (gate active)** |
| **ERP reval** | A/B + concurrency **ALL_PASS** |
| **Evidencia** | `prod.migrate_gate_latest.md` |
| **claimReady** | **false** |

## 2026-07-25 — ADR-064 prod migrate gate (código)

| Campo | Valor |
|-------|-------|
| **Cambio** | `migrate-prod` fail-closed en production sin approval CEO |
| **Staging** | auto-apply intacto |
| **Prod** | 519/520 **no revertidas**; futuras migs gated |
| **Tests** | `prodMigrateGate.test.ts` 13 PASS |
| **Runbook** | `docs/ops/PROD_MIGRATE_GATE_RUNBOOK.md` |
| **claimReady** | **false** |

## 2026-07-25 — TOTAL QUALITY · prod tip `5a36809c` · 519/520 already applied

| Campo | Valor |
|-------|-------|
| **Staging tip** | **`5a36809c`** · deploy **`5965c32b` SUCCESS** |
| **Prod tip** | **`5a36809c`** · deploy **`05abdfa7` SUCCESS** |
| **Prod migrate** | skip 519/520 (already applied) |
| **claimReady** | **false** |

## 2026-07-25 — tip `5a36809c` staging · reserve + A/B + concurrency

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip** | **`5a36809c`** |
| **Deploy** | **`5965c32b` SUCCESS** |
| **Evidence** | `erp.http_ab_isolation_latest.md` · `erp.concurrency_latest.md` |
| **claimReady** | **false** |

## 2026-07-25 — ADR-061 VERIFIED · tip `9e931f08` · mig 519+520 · restart ALL_PASS

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip** | **`9e931f08`** |
| **Deploy mig** | **`86c93c8c` SUCCESS** |
| **Deploy recycle** | **`794662d7` SUCCESS** |
| **Evidence** | `erp.persistence_restart_latest.md` **ALL_PASS** |
| **claimReady** | **false** |

## 2026-07-25 — ADR-061 Postgres ERP SSOT · mig 519+520 · API `with*Persistence` (código previo a VERIFIED)

| Campo | Valor |
|-------|-------|
| **Env** | local → then staging VERIFIED (see entry above) |
| **Tip / live staging (histórico)** | was **`bd165985`** before tip **`9e931f08`** |
| **ERP honesty** | process-memory **no longer SSOT** when `DATABASE_URL` |
| **claimReady** | **false** · **NOT READY** · **CONDITIONAL_READY** |

## 2026-07-25 — ADR-060 ERP catalog v1.7.0 + mig 519 (local · deploy **pending** · SSOT superseded by ADR-061)

| Campo | Valor |
|-------|-------|
| **Env** | local verified · staging/prod deploy **pending** parent commit |
| **Tip / live staging** | **`bd165985`** · deploy **`1de7f724` SUCCESS** (catalog **v1.6** lineage — **sin** v1.7.0 / **519** aún) |
| **Local tip** | **uncommitted** · OsCatalogV1 **v1.7.0** · `/saas/erp/*` + `/api/saas/erp/*` · mig **519** schema reserved |
| **ERP honesty** | (histórico ADR-060) Runtime SSOT **in-memory** — **superseded** by ADR-061 · payments/IoT/signature/health **BLOCKED_*** · **no Odoo** |
| **Evidence** | `erp.cores_synthetic_latest.md` **ALL_PASS** |
| **claimReady** | **false** · **NOT READY** · **CONDITIONAL_READY** |
| **Próximo** | See ADR-061 VERIFIED entry above |

## 2026-07-25 — Staging tip confirm (cierre interno / tip `bd165985`)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip / live** | **`bd165985`** · deploy **`1de7f724` SUCCESS** |
| **Flags** | `AUTONOMOUS_ALLOW_OPENAI=0` · prod canary OFF · ads spend 0 |
| **Catalog** | Live **v1.6** closure (i18n/obs/mobile) · local ERP **v1.7.0** **uncommitted** (see entries above) |
| **claimReady** | **false** · **NOT READY** · **CONDITIONAL_READY** |
| **Nota** | Superseded by tip **`9e931f08`** + mig 519/520 VERIFIED |

## 2026-07-24 — ADR-057 Blocks 11–25 complete (local · deploy pending)

| Campo | Valor |
|-------|-------|
| **Env** | local verified · staging deploy **pending push** |
| **Tip / live** | **TBA** (parent commit pending) |
| **Staging URL** | https://ideal-victory-staging.up.railway.app |
| **Blocks** | 11–25 internal cores complete · catalog **v1.4.0** |
| **Tests** | `tsc` **0** · `backend/agency` **249 PASS** · influencers pack **PASS** · `pwa-certify` **PASS** · private-rag synthetic **ALL_PASS** (27 tests) |
| **Prod flags** | **OFF** / **ABSENT** · no OpenAI · no Pepito · no Twilio/ads/publish/OAuth reales · no App Store publish |
| **claimReady** | **false** · **NOT READY** · **CONDITIONAL_READY** |
| **Próximo** | CEO checklists + **confirm staging deploy after push** |

## 2026-07-24 — ADR-056 elite absolute audit (local fixes · deploy pending)

| Campo | Valor |
|-------|-------|
| **Env** | local fixes · staging runtime unchanged |
| **Tip / live** | **TBA** (ADR-056 fixes uncommitted · base **`6364c28c`**) · runtime staging still ADR-055 **`53149384`** |
| **Deploy staging** | **`e514bbd7`** SUCCESS (ADR-055 lineage · no redeploy yet) |
| **P0 fix** | Campaign launch blocked by `getCampaignLaunchBlockReason` while `claimReadyLegal=false` (test bypass only) |
| **P1 fixes** | `isOpenAiSpendAllowed` gates chat+ai-copy · `mcp.write` no longer invented · shared-memory scopes split · `meta-ads-pack` → beta OAuth OFF |
| **Tests** | tsc **0** · CampaignsLegal+saasCampanias+saasEnv+mcpProductive+catalog availability **PASS** · agency **109 PASS** · eslint changed routes **0** |
| **Staging flags** | `ideal-victory` Online · `AI_ENABLED=1` · `OLLAMA_HOST` Tailscale CGNAT private · `AUTONOMOUS_ALLOW_OPENAI=0` · MCP/SM productivo=0 · VISUAL=0 |
| **Prod flag read** | Railway briefly switched · `NELVYON_*` OpenAI/MCP/SM/OpenClaw/visual **ABSENT** · restored to staging + re-linked `ideal-victory` |
| **Pepito** | untouched |
| **claimReady** | **false** · **NOT READY** · **AUDIT_FIXES_LOCAL** |

## 2026-07-24 — ADR-055 E2E PASS (staging)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip / live** | **`53149384`** · `git_sha=531493844597` |
| **Deploy** | **`e514bbd7`** SUCCESS |
| **E2E** | `automations-ops-pack` + `reputation-ops-pack` **ALL_PASS** · 6 entregables/pack · auto-approve |
| **Flags** | AUDITOR=1 · OPENCLAW staging_mock · `NELVYON_SHARED_MEMORY_STAGING=1` · `NELVYON_MCP_STAGING_SYNTHETIC=1` · AUTOMATIONS_OPS=1 · REPUTATION_OPS=1 · SM/MCP productivo=0 · VISUAL=0 · OpenAI/payouts=0 |
| **Evidence** | `automations_reputation_e2e_latest.md` |
| **Prod** | untouched |
| **claimReady** | **false** · **NOT READY** |

## 2026-07-24 — ADR-055 cierre local (deploy staging **pending**)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` — **not deployed yet** |
| **Tip / live** | **TBA** (working tree ADR-055 · push pending) · live sigue ADR-054 `980ea216` |
| **Local verify** | agency **64+ PASS** · tsc **0** · catalog **1.2.0** |
| **Packs** | `automations-ops-pack` + `reputation-ops-pack` wired **beta** · E2E **pending** |
| **Flags (post-deploy plan)** | AUDITOR=1 · OPENCLAW staging_mock · `NELVYON_SHARED_MEMORY_STAGING=1` · `NELVYON_MCP_STAGING_SYNTHETIC=1` · SM/MCP productivo=0 · VISUAL=0 · OpenAI/payouts=0 |
| **Prod** | untouched |
| **claimReady** | **false** |

## 2026-07-24 — ADR-054 cierre 6 puntos (staging)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip / live** | `980ea216` · `git_sha=980ea2167cc4` |
| **Deploy** | `23f637b9-88cc-43ef-ac85-d8bc45ad68e5` SUCCESS |
| **E2E** | 11 packs + auditor **ALL_PASS** |
| **Flags** | AUDITOR=1 · OPENCLAW staging_mock · VISUAL=0 · SM/MCP/OpenAI/payouts=0 |
| **Evidence** | `auditor.all_packs_e2e_latest.md` |
| **Prod** | untouched |
| **claimReady** | **false** |

## 2026-07-24 — ADR-053 OS v1 closure (staging)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip / live** | `37b8bd42` · `git_sha=37b8bd425479` |
| **Deploy** | `dd7505e9-7786-4712-8cd5-84dbb7fb2441` SUCCESS |
| **Flags** | AUDITOR=1 · OPENCLAW=1 · STAGING_MODE=1 · SM=0 · MCP=0 · OpenAI=0 |
| **Smokes** | `staging-smoke-os-v1-closure` ALL_PASS · social+auditor ALL_PASS |
| **Evidence** | `auditor.openclaw.catalog_v1.md` |
| **Prod** | untouched · coste 0 |
| **claimReady** | **false** |

## 2026-07-24 — Social ADR-052 CERT (staging only)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip / live** | `4d331b55` · `git_sha=4d331b5540fd` |
| **Deploy** | `85fe50cc-fa23-4094-a7e6-852713cd0db1` SUCCESS (push ADR-052; único deploy de servicio) |
| **CI follow-up** | tip `83b757da` workflow fix (deploy secundario posible; no tocado prod) |
| **Pack E2E** | `social-calendar-pack` **ALL_PASS** · 7 entregables portal auto-approve |
| **Evidence** | `scripts/docs/evidence/os-saas-e2e/modules/social.adr052_e2e.md` |
| **Gates** | OpenAI/OpenClaw/MCP/SM/payouts/paid social/publish/visual **OFF** |
| **Prod** | untouched · coste 0 |
| **claimReady** | **false** |

## 2026-07-24 — Cert 5 packs beta (ADR-048/050)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip / live** | `eb462545a992` |
| **Pack E2E** | social/content/cro/analytics/brand **ALL_PASS** |
| **Evidence** | `.release-logs/beta-packs-e2e-2026-07-24T13-42-38.txt` |
| **Tools** | Matomo/Umami **REJECT/DEFER** · 0 installs |
| **Prod** | IA/mesh OFF · coste 0 |
| **claimReady** | **false** |

## 2026-07-24 — Post-mesh cierre (Pack E2E ALL_PASS)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Tip / live** | `99b307306078` |
| **Deploy** | `c2e48d13-0a5e-49c6-bc1f-aa1e69f43345` SUCCESS |
| **Join** | **PASS** `MESH_JOIN_OK` · peer `nelvyon-staging-web-3` active |
| **Pack E2E** | **ALL_PASS completed** · 5 auto-approve · portal invite PASS |
| **Portal packs** | **ALL_PASS** |
| **Prod** | untouched · IA flags ABSENT · `OPENAI_API_KEY` **ABSENT** |
| **claimReady** | **false** (legal campañas) |

## 2026-07-23 — Mesh final verify (JOIN_OK · async kickoff)

| Campo | Valor |
|-------|-------|
| **Env** | staging `ideal-victory` |
| **Deploy** | `6aeb4106-0f55-4198-863b-a396e6d118e2` SUCCESS (railway up) |
| **Prior fails** | `e3029db9` TS never · `fd33977f` entrypoint CRLF · `a36ca330` model?:string |
| **Join** | **PASS** `MESH_JOIN_OK` · peer `nelvyon-staging-web-1` active |
| **Pack** | `f5de9c43` needs_review · Ollama real |
| **Prod** | untouched · IA flags ABSENT |
| **claimReady** | **false** |

## 2026-07-23 — Mesh ADR-044 tip `1d5d620a` (deploy SUCCESS · join FAIL)

| Campo | Valor |
|-------|-------|
| **Tip** | `1d5d620a` (prior failed `2a7bc689` types; fix HTTP-only proxy) |
| **Staging deploy** | `03a16532-8246-417f-9024-63ef10b0ddcc` **SUCCESS** |
| **Live** | `git_sha=1d5d620ab4e9` · live/ready **200** |
| **Join** | **FAIL** `MESH_JOIN_FAIL` invalid/consumed ephemeral key · peer offline |
| **Pack E2E** | WARN_FAIL critical=0 · 1 WARN download 404 |
| **Unit tests** | 44/44 PASS |
| **Prod** | IA/mesh **ABSENT** |
| **Rollback** | `NELVYON_AI_ENABLED=0` + `OLLAMA_CONFIGURED=0` |
| **claimReady** | **false** |

## 2026-07-23 — Mesh staging verify (join FAIL · entrypoint harden)

| Campo | Valor |
|-------|-------|
| **Staging deploy** | `6f7d025a` SUCCESS · live/ready 200 · sha `bf9b24d1` |
| **Join** | **FAIL** invalid `TS_AUTHKEY` · peer offline |
| **Fix** | Entrypoint: proxies only on MESH_JOIN_OK (ADR-043) |
| **Prod** | IA/mesh **ABSENT** |
| **Rollback** | `NELVYON_AI_ENABLED=0` + `OLLAMA_CONFIGURED=0` |
| **claimReady** | **false** |

## 2026-07-23 — Mesh Option A staging prep (ADR-042 · **no** prod)

| Campo | Valor |
|-------|-------|
| **PC** | Ollama listen Tailscale IP only · `/api/tags` PASS |
| **Staging** | `NELVYON_MESH_OPTION_A=1` · `OLLAMA_HOST` set · AI=0 · no `TS_AUTHKEY` yet |
| **Prod** | mesh keys **ABSENT** |
| **Dockerfile** | optional mesh entrypoint (no-op without key) |
| **Coste** | **0** |
| **claimReady** | **false** |

## 2026-07-23 — CEO staging canary Router+QR (ADR-041 · **no** prod IA)

| Campo | Valor |
|-------|-------|
| **Scope** | Railway env **staging** · service `ideal-victory` only |
| **Flags** | Router=1 · QR=1 · models 3b/8b · AI=0 · OLLAMA_CONFIGURED=0 · OpenAI=0 · payouts=0 |
| **Prod** | IA canary keys **ABSENT** · live SHA `fcf2622cc02d` |
| **Staging live** | `e52f851a9142` |
| **Evidence** | local Option C ALL_PASS · `.release-logs/canary-staging-router-qr-20260723.txt` |
| **Redeploy prod** | **NO** |
| **Coste** | **0** |
| **claimReady** | **false** |

## 2026-07-22 — Total internal-safe closure (docs + P0 honesty · **no** web redeploy)

| Campo | Valor |
|-------|-------|
| **Live SHA** | unchanged `9ca0cf29a5e5` · deploy `7d625161` |
| **FastAPI** | `/health` **200** · deploy `25e2109d` |
| **Smokes** | portal-packs **PASS** · P0 SUCCESS `29944606938` · pack E2E SKIP_IA_OFF |
| **Backup** | **DONE** `29932453133` |
| **Redeploy** | **NO** (smokes/docs/prep only) |
| **IA flags** | OFF · cost 0 |
| **claimReady** | **false** |

## 2026-07-22 — Web git_sha restore tip `9ca0cf29` (`7d625161`)

| Campo | Valor |
|-------|-------|
| **Tip** | `9ca0cf29a5e5` (SQL SSOT harden + docs) |
| **Command** | `railway redeploy --service "@nelvyon/web" --from-source -y` × **1** |
| **Web deploy** | `7d625161-5d81-4295-8c6b-5cd1417fbbc5` **SUCCESS** |
| **SHA vivo** | `9ca0cf29a5e5` (app + apex) · live/ready **200** |
| **FastAPI** | auto-deploy `25e2109d` **SUCCESS** · `SKIP_ALEMBIC=1` |
| **Auto-deploy web** | tip push was **SKIPPED** (no watched files) → manual `--from-source` required |
| **Smokes** | KI020_PASS · portal-packs **SKIP** (no STAGING_QA_PASSWORD) · prior automations 200 evidence |
| **IA flags** | OFF · cost 0 |
| **claimReady** | **false** |

## 2026-07-22 — Post-automations SQL SSOT harden (pre web git_sha restore)

| Campo | Valor |
|-------|-------|
| **Code** | `is_duplicate_table_error` cause-chain · pytest 5/5 · `validate-sql-alembic-ssot` ALL_PASS |
| **FastAPI** | deploy **`0d5a7ce9` SUCCESS** · tip `b8a5f921` · `SKIP_ALEMBIC=1` confirmed |
| **Schema DB probe** | `_migrations` **517**+**518** · `workspaces.timezone` · `workflows.is_active` |
| **Web** | was `git_sha:null` → restored in deploy `7d625161` |
| **IA flags** | OFF · cost 0 |
| **claimReady** | **false** |

## 2026-07-22 — Automations 401 closure (FastAPI `0460249e` → superseded by `0d5a7ce9`)

| Campo | Valor |
|-------|-------|
| **Auth** | JWT_SECRET sync web→FastAPI (ADR-038) |
| **Schema** | mig 517+518 applied prod Postgres |
| **FastAPI** | shared DB · `SKIP_ALEMBIC=1` · deploy **SUCCESS** `0460249e` (later `0d5a7ce9`) |
| **BFF unified** | **200** · portal-packs ALL_PASS |
| **claimReady** | **false** |

## 2026-07-22 — DNS/SSL verify + CSRF app Origin fix (`8d840360`)

| Campo | Valor |
|-------|-------|
| **DNS/SSL** | `app.nelvyon.com` **PASS** · evidence `dns-app-verify-pass-20260722.txt` |
| **Health** | live/ready **200** · SHA `8d84036055a1` (apex + app) |
| **CSRF** | **KI020_PASS** · apex + `app.nelvyon.com` Origin |
| **Deploy** | `bebc41d7` **SUCCESS** (push); brief 404 during stuck-build recovery |
| **claimReady** | **false** (legal + IA CEO) |

## 2026-07-22 — CEO ops closure (no redeploy; scripts/docs/CI)

| Campo | Valor |
|-------|-------|
| **SHA vivo** | `e62d52cc5d61` (sin cambio tip) |
| **Railway domain** | `app.nelvyon.com` added · DNS CF pending |
| **Smokes** | **ALL_P0_PASS** · secret EXISTS · workflow wired |
| **Backup** | Database Backup **success** `29932453133` |
| **Deploy app** | **NONE** (solo scripts/workflow/docs) |
| **claimReady** | **false** |

## 2026-07-22 — Prod redeploy closure tip `e62d52cc` SUCCESS (`1613fbb5`)

| Campo | Valor |
|-------|-------|
| **Tip** | `e62d52cc5d610e8f87d9f22e52c310616d85bf2c` (ADR-037 · OllamaRuntimePrep · canary docs) |
| **Command** | `railway redeploy --from-source -y` × **1** (truthful-respect / `@nelvyon/web` / production) |
| **Deployment** | `1613fbb5-c0b2-41f1-9c4a-4c122cdd248e` **SUCCESS** |
| **SHA vivo** | `e62d52cc5d61` · live/ready **200** |
| **Env** | **no mutations** · QR / OpenAI allow / MCP / SM / OpenClaw / CEO payouts / Local Router / OLLAMA* **ABSENT** |
| **Note** | Push auto-deploy `0d2c85a8` stuck on image push → REMOVED; CLI redeploy recovered |
| **Smokes** | Superseded 2026-07-22: **ALL_P0_PASS** (secret EXISTS) |
| **Cloudflare** | Domain added Railway; CF DNS still blocker (`DNS_APP_NELVYON.md`) |
| **Cost** | **0** |
| **Evidence** | `.release-logs/prod-redeploy-closure-20260722.txt` |
| **Cloudflare** | Unique blocker CNAME `app.nelvyon.com` (no MFA bypass) |

---

## 2026-07-22 — Prod redeploy elite-next tip `06690725` SUCCESS (`9d489e77`)

| Campo | Valor |
|-------|-------|
| **Tip** | `06690725a67d359d090dd8c9b387a59b21f44e94` (incluye `26ce8d00`) |
| **Command** | `railway redeploy --from-source -y` × **1** |
| **Deployment** | `9d489e77-6a73-4d9b-a5d5-1b2b17b8d09c` **SUCCESS** |
| **SHA vivo** | `06690725a67d` · live/ready **200** |
| **Env** | **no mutations** · quality routing / OpenAI / MCP / SM / OpenClaw / CEO payouts / OLLAMA **ABSENT** |
| **Smokes** | BLOCKED `STAGING_QA_PASSWORD` |
| **Cost** | **0** |
| **Evidence** | `.release-logs/prod-redeploy-elite-next-20260722.txt` |
| **Cloudflare** | Unique blocker CNAME `app.nelvyon.com` (no MFA bypass) |

---

| Campo | Valor |
|-------|-------|
| **Tip** | `2b51581ddaf6ecb8405a9dc4ba9a1a9f6a80feb5` (cadena desde `4bc0282b` + MCP OFF + track deps) |
| **Command** | `railway redeploy --from-source -y` (truthful-respect / @nelvyon/web / production) |
| **Deployment** | `4cb01795-f6b5-41fe-8257-546d95ee23ae` **SUCCESS** |
| **Failed earlier** | `d6af9ec0` (untracked MCP/router) · `dbd09735` (untracked specialization) — corregidos antes del SUCCESS |
| **Preflight** | git archive + import-chain · visited **69** · missing **0** |
| **SHA vivo** | `2b51581ddaf6` · live/ready **200** |
| **Env flags** | **not set** · ABSENT: AUTONOMOUS_ALLOW_OPENAI · MCP · SHARED_MEMORY · CEO_PAYOUTS · OPENCLAW* |
| **Cost** | **0** |
| **Evidence** | `.release-logs/prod-redeploy-unify-20260722-final.txt` |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` |

---

## 2026-07-22 — Prod redeploy OpenAI opt-in (`3f860c06`) SUCCESS

| Campo | Valor |
|-------|-------|
| **Deploy ID** | `d4650e99-8fe1-41bf-b80b-a1b3fb8aca88` |
| **Command** | `railway redeploy --from-source -y` · `truthful-respect` / production / `@nelvyon/web` |
| **Commit** | `3f860c06eaca8c60ca14edd3831f94e026bb95d6` |
| **Status** | **SUCCESS** (BUILDING→DEPLOYING→SUCCESS ~10 min) |
| **Gates pre** | tsc **0** · vitest **22/22** · pack gate **51** ALL_PASS |
| **Health** | live **200** `git_sha=3f860c06eaca` · ready **200** db ok |
| **Logs** | migrate complete · `[nelvyon] Ready on http://0.0.0.0:3000` · healthcheck succeeded · no headers error · no OpenAI egress visible |
| **IA flags set** | **None** (`AUTONOMOUS_ALLOW_OPENAI` absent · no OLLAMA/SHARED_MEMORY/MCP/OpenClaw ON) |
| **Second redeploy** | **No** |
| **Costes** | **0** |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app`. No MFA bypass attempted. |
| **Evidencia** | `.release-logs/prod-redeploy-20260722.txt` · `prod-redeploy-poll-20260722.txt` · `prod-post-redeploy-verify-20260722.txt` · `final-gates-*.txt` |
| **Proposal** | `docs/PROPOSAL_QUALITY_ROUTING_LOCAL.md` (docs only; no model cert change) |

---

## 2026-07-22 — OpenAI opt-in only + prompt schemas (sin deploy)

| Campo | Valor |
|-------|-------|
| **Deploy** | **No** (code+docs only; no Railway; no prod AI flags) |
| **Commit** | `fix(autonomous): OpenAI opt-in only; prompt schemas for local packs` |
| **Policy** | OpenAI requires `AUTONOMOUS_ALLOW_OPENAI=1` · no auto-fallback · Ollama primary |
| **Vitest** | `llmAdapter.ollama`+`phaseC`+`saasEnv` **22/22** |
| **tsc** | **0** (`isInternetTaskAuthorized`) |
| **Pack gate** | **ALL_GATE_PASS** 51 |
| **Phase C QA** | 3b **55** (model limit) · 8b **89** (evidence) · threshold 85 |
| **HTTP E2E** | kickoff `needs_review` 3b · `.release-logs/hardening-ia-packs-20260722.txt` |
| **OpenAI paid** | **None** |
| **IA prod** | OFF |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app`. No MFA bypass attempted. |

---

## 2026-07-22 — Ollama-first llmAdapter + local HTTP pack E2E (sin deploy)

| Campo | Valor |
|-------|-------|
| **Deploy** | **No** (code+docs only; no Railway; no prod AI flags) |
| **Commit** | `fix(autonomous): Ollama-first llmAdapter contract + local pack E2E evidence` |
| **Ollama** | `:11434` models=6 · `/api/generate` PASS (`llama3.2:3b`) |
| **Vitest** | `llmAdapter.ollama` **3/3** · `phaseC` **10/10** |
| **Pack gate** | `run-os-pack-gate` **ALL_GATE_PASS** 51 · `.release-logs/local-cierre-tecnico-20260722.txt` |
| **HTTP kickoff** | Next **dev** + OLLAMA_* · kickoff POST PASS · **56× mode=real** · smoke as-complete 🟡 `needs_review` (QA&lt;85) |
| **Docker** | test Postgres :5433 + local-ai Postgres :5434 healthy · migrate+seed QA |
| **Staging localhost** | **No** set |
| **OpenAI paid** | **None** |
| **IA prod** | OFF |
| **Evidencia** | `.release-logs/local-http-pack-e2e-ollama-20260722.txt` |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app`. No MFA bypass attempted. |

---

## 2026-07-22 — Docs push + local pack E2E Ollama (pasada previa, sin deploy)

| Campo | Valor |
|-------|-------|
| **Deploy** | **No** (docs only) |
| **Commit 1** | `e15055e9` — `docs(ops): close KI-R028 Stripe; classify LLM staging; DNS CNAME blocker` · pushed |
| **Commit 2** | `7d543d6e` local E2E evidence + Cloudflare sole blocker (docs) |
| **Ollama** | `:11434` models=6 · `/api/generate` PASS (`llama3.2:3b`) |
| **Pack gate B** | `run-os-pack-gate` **ALL_GATE_PASS** 51 tests |
| **Vitest A** | `llmAdapter.ollama` **FAIL** 1/3 (WIP — superseded by Ollama-first fix) |
| **HTTP kickoff C** | **BLOCKED** then — Docker was DOWN (superseded) |
| **Staging localhost** | **No** set |
| **IA prod** | OFF |
| **Evidencia** | `.release-logs/local-pack-e2e-ollama-20260722.txt` |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app`. No MFA bypass attempted. |

---

## 2026-07-22 — Ops audit post-deploy (sin redeploy)

| Campo | Valor |
|-------|-------|
| **Alcance** | Stripe KI-028 · DNS app · clasificar LLM_NOT_CONFIGURED |
| **Deploy** | **No** |
| **Stripe** | price-audit **allValid=true** → **KI-R028** |
| **DNS** | `app.nelvyon.com` **NXDOMAIN** · sin Cloudflare API/wrangler |
| **LLM** | Staging AUTONOMOUS sin Ollama/OpenAI · local Ollama OK · **no** fallo prod |
| **SHA vivo** | `bba71f14afc1` · live/ready 200 |

---

## 2026-07-22 00:39–00:51 UTC — Prod redeploy KI-030 `bba71f14` SUCCESS

| Campo | Valor |
|-------|-------|
| **Deploy ID** | `3f08f13d-4cd1-469e-9761-80f4576612b6` |
| **Commit** | `bba71f14afc1` |
| **Método** | `railway redeploy --from-source -y` (único; push previo SKIPPED `063e4b96`) |
| **Servicio** | `@nelvyon/web` / production / `truthful-respect` |
| **Resultado** | **SUCCESS** |
| **SHA vivo** | `bba71f14afc1` |
| **Health** | live **200** · ready **200** (db/auth/env ok) |
| **Runtime logs** | `[migrate] all migrations complete` · `Ready on :3000` · **sin** headers module error |
| **Fix** | CMD `cd /app/apps/web && exec node server.js` · WORKDIR `/app` · `.dockerignore` |
| **Local gate** | `nelvyon-ki030:fixed` Ready PASS pre-redeploy |
| **Smokes staging** | portal-packs **PASS** · local-pack-e2e **FAIL** `LLM_NOT_CONFIGURED` · `railway run` en `ideal-victory` |
| **Prohibido** | No 2º redeploy · no SQL · IA prod OFF |
| **Evidencia** | `.release-logs/ki030-poll-3f08f13d.txt` · `p0-smokes-post-ki030.txt` |
| **KI-030** | **Resuelto** → historial **KI-R030** |

---

## 2026-07-22 — KI-030 fix local Docker PASS (pre-redeploy)

| Campo | Valor |
|-------|-------|
| **Cambio** | Root `Dockerfile` CMD: `cd /app/apps/web && exec node server.js` · `WORKDIR /app` · `.dockerignore` WIP API routes |
| **Causa** | `next.config` resuelve `./src/lib/security/headers` desde cwd; cwd `/app` fallaba tras KI-029 |
| **Local build** | `docker build -f Dockerfile -t nelvyon-ki030:fixed .` **PASS** |
| **Local start** | `Ready on http://0.0.0.0:3000` · **sin** `Cannot find module './src/lib/security/headers'` |
| **Gates** | vitest securityHeaders SSOT 3/3 · tsc 0 |
| **Prod pre** | live 200 SHA `3d2bba18bcae` · ready 503 |
| **Redeploy** | Autorizado **uno** `railway redeploy --from-source -y` tras push (ver entrada post-deploy) |
| **Prohibido** | No 2º redeploy · no SQL · IA prod OFF |

---

## 2026-07-21 17:20–17:36 UTC — Prod redeploy KI-029 `a82d618f` (mig OK · app FAILED)

| Campo | Valor |
|-------|-------|
| **Deploy ID** | `922c8039-2aa3-42a0-8a18-e5ae9c5a8142` |
| **Commit** | `a82d618fa016da3eaf45244566ec54a2667988c0` |
| **Método** | `railway redeploy --from-source -y` (único autorizado; **no** 2º) |
| **Servicio** | `@nelvyon/web` / production |
| **Resultado app** | **FAILED** · healthcheck `/api/health/live` · réplicas never healthy |
| **preDeployCommand (manifest)** | `["pnpm -C apps/web migrate:prod"]` |
| **Migrate logs** | **SÍ** — `[migrate] run/done` 512…516 · `all migrations complete` |
| **Migraciones 512–516** | **SÍ** — read-only `all512to516=true` · ejecutadas `2026-07-21T17:31:04Z` |
| **Error runtime** | `Cannot find module './src/lib/security/headers'` → **KI-030** |
| **SHA vivo (health)** | sigue `3d2bba18bcae` (deploy anterior SUCCESS) |
| **Smokes staging** | portal-packs **PASS** · local-pack-e2e **FAIL** `LLM_NOT_CONFIGURED` |
| **Prohibido** | No SQL manual · no 2º redeploy · IA prod OFF |
| **Evidencia** | `.release-logs/ki029-922c8039-*.txt` · `ki029-mig-check-512-516.txt` · `p0-smokes-post-ki029.txt` |
| **KI-029** | **Resuelto** (schema) → historial **KI-R029** |

---

## 2026-07-21 — KI-029 preDeployCommand versionado (config push)

| Campo | Valor |
|-------|-------|
| **Cambio** | `/railway.toml` + `/railway.json`: `preDeployCommand = ["pnpm -C apps/web migrate:prod"]` |
| **Dockerfile raíz** | COPY `apps/web/scripts` + workspace manifests; `WORKDIR /app`; `CMD ["node","apps/web/server.js"]` |
| **Commit** | `a82d618f` |
| **No UI** | Config-as-code only |
| **Verificación post-redeploy** | Ver entrada `922c8039` arriba |

---

## 2026-07-21 16:30–16:41 UTC — Prod redeploy `3d2bba18` (build fix headers)

| Campo | Valor |
|-------|-------|
| **Deploy ID** | `93957043-9edd-41bc-b12b-5ffab3853805` |
| **Commit** | `3d2bba18bcae6d6a817f259aaa6277c69dc1619d` |
| **Método** | `railway redeploy --from-source -y` (único; push previo SKIPPED por watchPatterns) |
| **Servicio** | `@nelvyon/web` / production |
| **Resultado app** | **SUCCESS** · healthcheck `/api/health/live` OK · SHA vivo `3d2bba18bcae` · ready 200 |
| **Build** | Dockerfile **raíz** (`/Dockerfile`) · runner **12/13** `COPY .../src/lib/security` · image push OK |
| **Runtime logs** | `[prod-env] validation OK` · `Ready on :3000` · **sin** líneas migrate/release |
| **Migraciones 512–516** | **NO aplicadas** — `_migrations` prod máx **`511_idempotency_keys.sql`** (query read-only `DATABASE_PUBLIC_URL`) |
| **Causa mig** | Release phase ausente en logs; service manifest sin release efectivo (repo `railway.json` declara `migrate:prod` pero no se ejecutó) |
| **Smokes** | staging portal-packs **PASS** · local-pack-e2e **FAIL** `LLM_NOT_CONFIGURED` |
| **Rollback** | No necesario (app sana; SHA anterior `60d098…` sustituido) |
| **Prohibido** | No SQL manual · no 2º redeploy automático · IA prod OFF |
| **Evidencia** | `.release-logs/deploy-93957043-*.txt` · `check-prod-migrations-512-516.mjs` · `p0-smokes-post-93957043.txt` |

---

## 2026-07-21 — Auditoría cierre élite total (solo lectura)

| Campo | Valor |
|-------|-------|
| **Alcance** | Re-ejecución gates locales + tabla release-readiness 16 sistemas |
| **Entorno** | Repo local · staging evidencia KI-026 (no re-migrate) |
| **Gates** | tsc PASS · vitest 2430/2437 (KI-027 FAIL) · verify-all NOT_READY · stubs PASS |
| **Deploy** | **No** |
| **Veredicto** | **CONDITIONAL_READY** · no READY |
| **Docs** | HANDOVER · AUDITORIA §9 · CTO_FINAL_VERIFY · PROJECT_STATUS · DATABASE · etc. |

---

## Plantilla

```
## YYYY-MM-DD HH:MM UTC
| Campo | Valor |
| Commit | |
| Rama | |
| Servicio Railway | Web / Python |
| Entorno | production / staging |
| Resultado | success / failed / partial |
| Migraciones aplicadas | |
| Errores | |
| Rollback | sí/no — cómo |
```

---

## 2026-07-21 — Bloques 3–13 (sin deploy prod)

| Campo | Valor |
|-------|-------|
| **Alcance** | Aislamiento staging · SES live · Stripe audit · Cloudflare audit · health · backups |
| **Deploy prod** | **NO** (mig prod≤511 · KI-028 · DNS app) |
| **Commit/push** | **NO** esta pasada |
| **Costes nuevos** | **0** |
| **Veredicto** | **CONDITIONAL_READY** |

---

## 2026-07-21 — Staging KI-026 RLS repair (`516`) + ADR-032

| Campo | Valor |
|-------|-------|
| **Alcance** | Policies dual-plane post-507 (operativo) |
| **Entorno** | Railway **staging** / `ideal-victory` — CLI **restaurado production** |
| **Mig creada** | `516_fastapi_rls_repair.sql` |
| **ADR** | **ADR-032** Dual-plane tenant isolation |
| **Resultado** | **SUCCESS** · 13 policies core · predicado funnels/chatbot OK · SM verified |
| **507 / 515 editadas** | **No** |
| **Deploy** | **No** |
| **Veredicto** | **CONDITIONAL_READY** · no READY |

---

## 2026-07-21 — Staging KI-025 unlock (`506a`+507…515) + Shared Memory verified

| Campo | Valor |
|-------|-------|
| **Alcance** | Rename `social_posts` legacy + migrate hasta Shared Memory |
| **Entorno** | Railway **staging** / `ideal-victory` — CLI **restaurado production** |
| **Mig creada** | `506a_reconcile_legacy_pre_507_social_posts.sql` |
| **Resultado** | **SUCCESS** 506a+507…515 · SM **verified:true** (node-pg) · 507: 498 ok / 81 warns |
| **507 editada** | **No** (prod ya tiene 507) |
| **Deploy** | **No** |
| **KI** | KI-025 ✅ · KI-021 ✅ staging · **KI-026** abierto (RLS gap) |
| **Veredicto** | **CONDITIONAL_READY** · no READY |

---

## 2026-07-20 — Staging repair KI-024 (`407a`+`408`…`506`) then stop @507

| Campo | Valor |
|-------|-------|
| **Alcance** | Reparación drift calendar_events + avance controlado hasta 506 |
| **Entorno** | Railway **staging** / `ideal-victory` — CLI **restaurado production** |
| **Mig creada** | `407a_reconcile_legacy_integer_calendar_events.sql` (sort ante 408; **no** `408a`) |
| **Resultado** | **SUCCESS** 407a+408…506 · `calendar_events` uuid+tenant_id · legacy 0 filas |
| **Stop** | **FATAL** @ `507_fastapi_runtime_schemas.sql` — 42804 `social_post_analytics_post_id_fkey` uuid vs integer (**KI-025**) |
| **514/515 / verify SM** | **No** / **NOT run** |
| **Deploy** | **No** |
| **KI** | KI-024 ✅ · KI-025 abierto · KI-021 bloqueado por 025 |

---

## 2026-07-20 — Staging repair KI-023 (`401a`+`402`…`407`) then stop @408

| Campo | Valor |
|-------|-------|
| **Alcance** | Reparación drift deals + reintento migrate hacia Shared Memory |
| **Entorno** | Railway **staging** / `ideal-victory` — CLI luego **restaurado a production** / `@nelvyon/web` |
| **Mig creada** | `backend/db/migrations/401a_reconcile_legacy_integer_deals.sql` (sort `401_ < 401a < 402`; idempotencia UUID+tenant antes de abort destino; check seq destino) |
| **Resultado parcial** | **SUCCESS** `401a`+`402`…`407` · `deals.id` uuid + `tenant_id` · pipelines/stages+FKs · legacy 0 filas |
| **Stop** | **FATAL** @ `408_calendar_events.sql` — `column "tenant_id" does not exist` (**KI-024**) |
| **514/515** | **No** aplicadas |
| **verify-shared-memory** | **NOT run** |
| **Deploy Railway** | **No ejecutado** |
| **KI** | KI-023 **resuelto staging** · KI-024 **abierto** · KI-021 sigue abierto (bloqueado por 024) |
| **Veredicto** | **CONDITIONAL_READY** · `claimComplete` **false** — **no** READY |
| **Próximo humano** | Auditar/reparar **408** (KI-024) con nueva autorización CTO → migrate → verify |

---

## 2026-07-20 — Staging repair KI-022 (`400a`+`401`) then stop @402

| Campo | Valor |
|-------|-------|
| **Alcance** | Reparación drift inbox + reintento migrate hacia Shared Memory |
| **Entorno** | Railway **staging** — CLI luego **restaurado a production** / `@nelvyon/web` |
| **Mig creada** | `backend/db/migrations/400a_reconcile_legacy_integer_conversations.sql` (sort `400_ < 400a < 401`; ADR-031) |
| **Resultado parcial** | **SUCCESS** `400a`+`401` · `conversations.id` uuid · `conversation_messages` FK OK · legacy 0 filas |
| **Stop** | **FATAL** @ `402_pipeline_deals.sql` — `column "tenant_id" does not exist` (**KI-023**) — **superseded** por repair KI-023 abajo/arriba |
| **514/515** | **No** aplicadas |
| **verify-shared-memory** | **NOT run** |
| **Deploy Railway** | **No ejecutado** |
| **KI** | KI-022 **resuelto staging** · KI-023 → luego **resuelto** (ver entry KI-023) |
| **Veredicto** | **CONDITIONAL_READY** · `claimComplete` **false** — **no** READY |
| **Próximo humano** | Ver entry repair KI-023 / KI-024 |

---

## 2026-07-20 — Bloque 2 Shared Memory staging attempt (BLOCKED @401 — histórico)

| Campo | Valor |
|-------|-------|
| **Alcance** | Intento migrate 514/515 + `verify-shared-memory-schema.mjs` en staging |
| **Entorno** | Railway **staging** / servicio `ideal-victory` — `DATABASE_URL` **existe** |
| **DB fingerprint** | Staging ≠ production (Supabase vs Railway-internal) |
| **Resultado** | **BLOCKED** · `pnpm -C apps/web migrate` **FAIL** @ `401_inbox_conversations.sql` (42804: FK `conversation_messages_conversation_id_fkey` uuid vs integer) |
| **514/515 en `_migrations`** | **No** (migrate no llegó) |
| **verify-shared-memory** | **NOT run** |
| **Railway CLI** | Temporal staging → **restaurado a production** / `@nelvyon/web` |
| **Deploy Railway** | **No ejecutado** |
| **KI** | KI-021 · KI-022 (schema drift) — **superseded** por repair entry arriba |
| **Próximo humano** | Ver entry repair `400a`/`401` / KI-023 |

---

## 2026-07-20 — Bloque 1 local-ai (NO es deploy Railway)

| Campo | Valor |
|-------|-------|
| **Alcance** | Docker Desktop + `backend/local-ai/docker-compose.yml` + Brain ingest |
| **Entorno** | **local** (127.0.0.1:5434) — **no** staging/prod |
| **Resultado** | success local · ingest `verified:true` · 1559 chunks |
| **Deploy Railway** | **No ejecutado** |
| **Pendiente ops** | migrate 514/515 remoto · SES · Stripe · Cloudflare |

---

## 2026-07-19 — Final Elite repo closure (código)

| Campo | Valor |
|-------|-------|
| **Alcance** | Security headers SSOT · migrate-pg splitter · SEO OG/sitemap/robots/schema · CI cleanup · Workforce PASS intacto |
| **Evidencia** | `tsc` OK · securityHeaders tests · validate-post-elite 508–514 · `workforce_certification.json` PASS |
| **Deploy prod** | **No ejecutado desde agente** — requiere Railway/CEO |
| **Pendiente ops** | SES production · Stripe prod · mig 514 staging · Cloudflare |

---

## 2026-07-10 — P3/P4 Fase 1 cierre técnico

| Campo | Valor |
|-------|-------|
| **Alcance** | optimizePackageImports, pnpm overrides, security-gates, Dependabot, backup fail-fast, CEO checklist |
| **Auditoría local** | `PHASE1_AUDIT_PASS`, build OK, 0 critical audit |
| **Docs** | HANDOVER, TODO, PROJECT_STATUS, CEO_FINAL_ACTIONS |
| **CEO pendiente** | `docs/CEO_FINAL_ACTIONS.md` |

---

## 2026-07-10 — P2 Ops enterprise

| Campo | Valor |
|-------|-------|
| **Alcance** | env validation, statusChecker, ops API, crons, backup workflow, log rotation |
| **Docs** | `docs/OPS.md` |
| **CEO pendiente** | GitHub secret `DATABASE_URL` para backup prod |

---

## 2026-07-10 — Staging Elite Gate SUCCESS

| Campo | Valor |
|-------|-------|
| **Run CI** | `29058208980` |
| **Commit** | `9937fb10` — deploy-wait soft mode |
| **Resultado** | ✅ ALL_ELITE_GATE_PASS |

---

## 2026-07-09 — Staging redeploy (BUILDING)

| Campo | Valor |
|-------|-------|
| **Servicio** | `ideal-victory` (staging) |
| **Deployment** | `1231b981` BUILDING |
| **Trigger** | `railway redeploy` post-P1 |

---

## 2026-07-09 12:41 UTC — Producción Web (SUCCESS)

| Campo | Valor |
|-------|-------|
| **Deployment ID** | `5c2be62e-891f-484f-9fed-78bb6f5fc0c2` |
| **Commit** | `815e4c0f` — docs + incluye `224a0a36` CEO brief fix |
| **Rama** | `main` |
| **Servicio** | Railway `@nelvyon/web` (proyecto `truthful-respect`, production) |
| **URL** | `https://nelvyon.com` |
| **Resultado** | ✅ SUCCESS |
| **Health post-deploy** | `GET /api/health/live` → `{"ok":true,"git_sha":"815e4c0f0e35"}` |
| **releaseCommand** | `pnpm exec tsx ../../backend/db/migrate.ts` (configurado; logs migrate no visibles en runtime logs) |
| **Migraciones** | ✅ 494 + 482–511 aplicadas manualmente 2026-07-09 17:02 UTC |
| **Errores runtime** | Ninguno crítico en logs de arranque (`Ready on http://0.0.0.0:3000`) |
| **Rollback** | No |

**Trigger:** push `git push origin main` (commits `224a0a36`, `815e4c0f`).

**Deploy anterior:** `9e4c9c05` SUCCESS 2026-07-07 — commit `735dce62`.

---

## Referencia — Proceso deploy Railway Web

1. Push a `main` → Railway build `apps/web/Dockerfile`
2. `releaseCommand`: `pnpm exec tsx ../../backend/db/migrate.ts`
3. Start: `node server.js` (:3000)
4. Health: `/api/health/live`

**Checklist:** `docs/LAUNCH_READY.md`, `docs/RAILWAY_DEPLOY_CHECKLIST.md`

---

## Referencia — API Python

1. Build `backend/Dockerfile`
2. `alembic upgrade head && uvicorn main:app`
3. Health: `/health`
4. URL prod: `https://nelvyon-app-production.up.railway.app`

---

## Historial anterior

| Fecha | Evento | Fuente |
|-------|--------|--------|
| 2026-07-07 | Deploy prod `735dce62` | Railway deployment `9e4c9c05` |
| 2026-07-04 | Hardening Fase 1 código cerrado | `LAUNCH_READY.md` |
| — | Deploys staging documentados | `backend/README.md` |
