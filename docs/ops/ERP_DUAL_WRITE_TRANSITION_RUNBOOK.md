# Runbook — ERP JSONB → relational dual-write (ADR-062)

> **Estado: PREPARED_OFF** · dual-write **NO** live · read flip **NO** · flags default **0**  
> SSOT vigente: `erp_domain_snapshots` (ADR-061) · `ErpDomainSnapshotStore` / `ErpPersistentRuntime`  
> Fecha: 2026-07-25 · Relacionado: `ERP_PROD_MIGRATE_519_520_RUNBOOK.md`

## Flags (fail-closed)

| Var | Default | Efecto |
|-----|---------|--------|
| `NELVYON_ERP_RELATIONAL_DUAL_WRITE` | `0` | `1` = mirror a tablas companion tras save snapshot |
| `NELVYON_ERP_RELATIONAL_READ` | `0` | `1` = lecturas desde relacional (**CEO only**) |

Unset / empty / cualquier valor ≠ `1` → **off**. `READ=1` con `DUAL_WRITE=0` → **prohibido** (misconfig → fail closed).

## Preflight (todas las fases)

- [ ] Staging: restart + A/B + concurrency ERP **ALL_PASS** en tip candidato
- [ ] `_migrations` 519+520 presentes; **sin** asumir 521+ applied
- [ ] Backup / PITR verificado
- [ ] Flags prod = `0` hasta fase autorizada
- [ ] Fuera de alcance: pagos, GL, tax, Odoo, IoT, e-sign

## Fases y gates

### Fase 0 — PREP (código only) — **DONE 2026-07-25**
Gate: unit `erpDualWritePrep.test.ts` PASS · este runbook en repo.  
**No** DDL · **No** flags env prod.

### Fase 1 — SCHEMA `521+` (futuro)
Gate: SQL solo `IF NOT EXISTS` / ADD · snapshots **intactos** · migrate staging OK.  
Prod migrate: gate ADR-064 + CEO.

### Fase 2 — DUAL_WRITE=1 (staging primero)
Gate: mutación escribe snapshot+mirror · conflict 409 · smokes PASS.  
Prod: **CEO** + ventana.

### Fase 3 — Backfill idempotente
Placeholder: `node scripts/erp-relational-backfill.mjs --dry-run|--apply`  
Gate: checksum snapshot↔relacional **100%** · re-run no duplica PK.

### Fase 4 — READ=1 (**CEO obligatorio**)
Gate: listados relacionales ≡ snapshot · smoke ALL_PASS.  
Firma: Nombre ____ Fecha ____ ☐ SÍ cutover.

### Fase 5 — Rollback
1. Set ambos flags `0`.  
2. Tráfico = snapshot-only (ADR-061).  
3. **No** DROP companions. Corrupción → PITR.

## Naming / archivos (prep)

- Flags: `backend/agency/erp/erpRelationalFlags.ts`
- Tests: `backend/agency/__tests__/erpDualWritePrep.test.ts`

## Estado honestidad

| Claim | Valor |
|-------|-------|
| Dual-write live | **false** |
| Read flip | **false** |
| `claimReady` | **false** |
