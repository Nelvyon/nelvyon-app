# TODO — NELVYON

> Prioridades vivas. Eliminar al completar. Actualizado: **2026-07-09**

---

## P0 — Bloqueantes producción

- [ ] **Push** commit `224a0a36` a `origin/main`
- [ ] **Deploy Railway** servicio Web
- [ ] **Aplicar migración 494** (`saas_ceo_brief_settings`) en prod — `pnpm -C apps/web migrate` o SQL manual
- [ ] **Verificar** POST `/api/cron/saas-ceo-brief` sin `42P01` tras migrate
- [ ] Confirmar migraciones **495–511** aplicadas en prod (drift check `_migrations`)

---

## P1 — Estabilidad y ops

- [ ] Commitear o revertir cambios locales: `config.py`, `load_env_files.py`, `README-dev-Windows.md`
- [ ] Actualizar `CLAUDE.md` — última migración → `511_idempotency_keys.sql`
- [ ] Confirmar SNS SES subscription post-deploy (LAUNCH_READY)
- [ ] Activar GitHub Actions cron staging-smoke si no activo
- [ ] Rotar credencial Supabase si estuvo expuesta en README (ya sustituida por placeholder)

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

- [x] Fix cron CEO brief — graceful `42P01` + tests (2026-07-09)
- [x] Sistema documentación viva `docs/HANDOVER.md` + 13 archivos (2026-07-09)
- [x] Setup PC dev — Node/Python/pnpm/Git (2026-07-07/08)
- [x] Fix Settings `database_url` Pydantic (2026-07-07)
