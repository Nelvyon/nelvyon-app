# TODO — NELVYON

> Actualizado: **2026-07-09** (post migración 494)

---

## P0 — Bloqueantes producción

- [x] Push commits CEO fix + docs a `origin/main`
- [x] Deploy Railway Web
- [x] Aplicar migración 494 en prod
- [x] Verificar cron CEO brief sin `schema_not_ready`
- [x] Aplicar migraciones 495–511 en prod

---

## P1 — Estabilidad y ops

- [ ] Push commit sesión (scripts, tests, docs)
- [ ] Re-ejecutar CI Staging Elite Gate + Web Quality Gates
- [ ] Redeploy staging con último `main`
- [ ] Investigar por qué `releaseCommand` no aplicó 482–494 en deploys previos
- [ ] Confirmar SNS SES subscription (AWS manual)
- [ ] Commitear o revertir setup dev local (`config.py`, README)

---

## P2 — Desarrollo

- [ ] `pnpm -C apps/web dev` como flujo diario principal
- [ ] Seed demo local opcional

---

## P3 — Fase 2 IA

- [ ] Activar provider LLM según ROADMAP

---

## Completado 2026-07-09

- [x] Migración 494 + tablas CEO brief en prod
- [x] Cron CEO brief `processed:1`
- [x] Migrate 482–511 prod
- [x] Fix tests `saasWorkflowsS30`
- [x] Documentación viva + deploy prod
