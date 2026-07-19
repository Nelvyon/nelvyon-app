# KNOWN_ISSUES — Errores conocidos

> No eliminar hasta resolver. Mover a **Historial resuelto** con solución.

---

## Activos

### KI-018 — Fase 2 Elite: residuales post-PASS (pgvector / ops)

| Campo | Valor |
|-------|-------|
| **Estado** | Abierto (no invalida PASS repo ni Elite ni Workforce PASS) |
| **Severidad** | Controlada |
| **Detalle** | `PHASE2_ELITE_CERTIFIED=true` con live Ollama + hybrid RAG. Pendiente: Docker/pgvector LocalVectorStore compare, migrate 514 staging, OpenClaw URL real. Workforce cert trata estos como `externalNotes` (no blockers internos). |
| **Docs** | `docs/PHASE2_ELITE_CERT.md` · ADR-026 |

### KI-016 — Docker Desktop local no disponible para E2E live

| Campo | Valor |
|-------|-------|
| **Severidad** | ~~Alta~~ → **Resuelto 2026-07-17** |
| **Detalle** | Engine UP; Postgres pgvector `:5433` + Redis `:6380`; live multi-tenant PASS |
| **Evidencia** | `PRODUCTION_CERTIFICATION_REPORT.md` · `live_multitenant_latest.json` |

---

### KI-017 — Migraciones con colisiones CREATE IF NOT EXISTS (fresh Postgres)

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Detalle** | Tablas homónimas legacy vs SaaS (`api_keys`, `invoices`, …). 406/415 corregidas; 507 consolidated skip en migrate-pg |
| **Mitigación** | Rename legacy + `MIGRATE_TOLERATE` stubs auth |
| **Fix** | Auditoría restante de IF NOT EXISTS; portar splitter 507 a migrate-pg |

---

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
| **Fix** | Ingest vector completo + cutover ops (no bloquea repo) |

---

### KI-009 — Railway SSH no configurado en entorno agente

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (ops) |
| **Detalle** | `railway ssh` requiere clave en `~/.ssh/` |
| **Fix** | `ssh-keygen -t ed25519` + `railway ssh keys add` |

---

### KI-014 — AWS SES en sandbox (sin production access)

| Campo | Valor |
|-------|-------|
| **Severidad** | **Alta** |
| **Detalle** | `ProductionAccessEnabled: false` — `ReviewDetails.Status: DENIED` (CaseId `178372013800016`). Dominio sí verificado (KI-013 resuelto). |
| **Fix** | CEO — apelación `docs/SES_PRODUCTION_ACCESS_APPEAL.md` + Support case AWS |
| **Bloquea producción email** | Sí para campañas/secuencias a destinatarios no verificados |

---

## Historial resuelto

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
