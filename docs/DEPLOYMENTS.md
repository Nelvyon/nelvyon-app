# DEPLOYMENTS — Historial de despliegues

> Registrar cada deploy significativo. Actualizado: **2026-07-23**

---

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
