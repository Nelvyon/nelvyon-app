# TODO — NELVYON

> Actualizado: **2026-07-10** (P3/P4 completadas; Fase 1 técnicamente cerrada)

---

## P0 — Bloqueantes producción

- [x] Completado y validado 2026-07-10

---

## P1 — Estabilidad y CI

- [x] Completado y validado 2026-07-10

---

> Actualizado: **2026-07-10** — auditoría cierre Fase 1

---

## P2 — Operación enterprise

- [x] Completado
- [x] CEO: `DATABASE_URL` secret GitHub (2026-07-10)
- [x] CEO: `PRODUCTION_BASE_URL` variable (2026-07-10)
- [ ] CEO: primer run workflow `Database Backup`
- [ ] CEO: SNS SES + dominio SES verificado (KI-011, KI-013, KI-014)

---

## P3 — Consolidación, rendimiento y deuda técnica

- [x] Bundle: `optimizePackageImports` en `next.config.ts`
- [x] Overrides seguridad `ws`, `axios`, `vitest` → `pnpm-workspace.yaml`
- [x] Validador migraciones post-elite 508–511
- [x] Script `run-phase1-audit.mjs`
- [x] Regresión P0–P2: typecheck, lint, elite reinforce — PASS
- [x] Build producción — PASS

---

## P4 — Hardening y cierre Fase 1

- [x] Workflow `security-gates.yml` (audit critical, Gitleaks, migrations)
- [x] Dependabot semanal
- [x] Backup fail-fast si falta `DATABASE_URL` en schedule
- [x] Checklist CEO consolidado (`docs/CEO_FINAL_ACTIONS.md`)
- [x] Documentación viva actualizada
- [ ] CEO: acciones manuales §1–8 en `CEO_FINAL_ACTIONS.md`

---

## Fase 2 — IA privada 100% local (2026-07-11)

- [x] Auditoría hardware (`docs/PHASE2_HARDWARE_AUDIT.md`)
- [x] Docker Compose Postgres+pgvector local
- [x] Migraciones `local_ai_*` + RLS tenant
- [x] LocalMemoryStore + LocalVectorStore + RagIngestPipeline
- [x] Embeddings Ollama local (sin API pago)
- [x] Backup pg_dump + AES opcional
- [x] PRIVATE_MODE allowlist (OpenClaw/MCP local OK)
- [x] Tests unitarios egress + integración Docker (8 pass, 2026-07-11)
- [x] Validación real: up/migrate/health/validate 7/7
- [x] RLS FORCE + rol app `nelvyon_local_app` (NOBYPASSRLS)
- [x] Ollama instalado + benchmark real (ver `PHASE2_BENCHMARK_RESULTS.md`)
- [x] Modelo LLM: `llama3.2:3b-instruct-q4_K_M`
- [x] Embeddings: `nomic-embed-text`
- [x] RAG smoke con embeddings reales
- [ ] Router multi-modelo
- [ ] 22 agentes (**NO hasta base validada**)
