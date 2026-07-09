# TODO — NELVYON

> Actualizado: **2026-07-09** (P1 cerrada)

---

## P0 — Bloqueantes producción

- [x] Push, deploy, migrate 494, cron CEO brief, migrate 495–511

---

## P1 — Estabilidad y ops

- [x] Push commits P1 (tests, Dockerfile, railway, dev setup)
- [x] Fix CI tests `packSeedMetadata` + `packAutoApprove`
- [x] `run-local-elite-reinforce` ALL_PASS
- [x] `pnpm gate` + `pnpm build` OK
- [x] Unificar `releaseCommand` → `migrate:prod` + Dockerfile scripts
- [x] Commitear setup dev local
- [x] Redeploy staging `ideal-victory`
- [ ] Verificar CI GitHub post-push (automático tras push)
- [ ] Confirmar SNS SES subscription (AWS manual — CEO)

---

## P2 — Desarrollo

- [ ] `pnpm -C apps/web dev` como flujo diario principal
- [ ] Seed demo local opcional

---

## P3 — Fase 2 IA

- [ ] Activar provider LLM según ROADMAP
