# TODO — NELVYON

> Prioridades vivas. Eliminar al completar. Actualizado: **2026-07-09** (post-deploy)

---

## P0 — Bloqueantes producción

- [x] **Push** commits `224a0a36` + `815e4c0f` a `origin/main`
- [x] **Deploy Railway** servicio Web — deploy `5c2be62e` SUCCESS
- [ ] **Aplicar migración 494** en prod — **SQL manual requerido** (releaseCommand no efectivo; cron confirma tablas ausentes)
- [x] **Verificar** POST `/api/cron/saas-ceo-brief` — HTTP 200, `schema_not_ready` (sin 500)
- [ ] Confirmar migraciones **495–511** aplicadas en prod (drift check `_migrations`)

---

## P1 — Estabilidad y ops

- [ ] Configurar SSH keys Railway para verificación remota (`railway ssh keys add`)
- [ ] Commitear o revertir cambios locales: `config.py`, `load_env_files.py`, `README-dev-Windows.md`
- [ ] Arreglar tests `saasWorkflowsS30.test.ts` (7 fallos `toIso`)
- [ ] Arreglar CI Staging Elite Gate (`packSeedMetadata.test.ts`)
- [ ] Confirmar SNS SES subscription post-deploy (LAUNCH_READY)
- [ ] Redeploy staging con último `main` (actualmente `735dce62`)

---

## P2 — Desarrollo siguiente

- [ ] Conectar `DATABASE_URL` Supabase en `.env` local (opcional vs SQLite)
- [ ] Instalar CLIs opcionales: `gh`, `railway`, `supabase` (paridad portátil)
- [ ] Seed demo: `python backend/scripts/seed_demo_abcd.py --reset`
- [ ] Migrar flujo diario a `pnpm -C apps/web dev` (vs Vite legacy)

---

## P3 — Fase 2 IA

- [ ] Definir provider inicial (`NELVYON_AI_MODE=stub` dev → OpenAI/Ollama staging)
- [ ] Implementar RAG ingest pipeline (ver PRIVATE_AI_ARCHITECTURE checklist)
- [ ] Wire `SaasPrivateAiService` a UI `/saas/private-ai`
- [ ] Evaluar OpenClaw bridge (solo si requisito explícito)

---

## P4 — Mejoras / deuda

- [ ] n8n instancia self-hosted + webhook Nelvyon
- [ ] Cloudflare Tunnel si acceso privado a servicios internos
- [ ] Consolidar docs legacy `docs/*` → enlazar desde HANDOVER (no borrar)
- [ ] Script `scripts/sync-handover-metadata.mjs` en CI pre-deploy

---

## Completado recientemente

- [x] Push + deploy prod `815e4c0f` (2026-07-09)
- [x] Fix cron CEO brief — graceful `42P01` + tests (2026-07-09)
- [x] Sistema documentación viva `docs/HANDOVER.md` + 14 archivos (2026-07-09)
- [x] Setup PC dev — Node/Python/pnpm/Git (2026-07-07/08)
- [x] Fix Settings `database_url` Pydantic (2026-07-07)
