# Runbook — Prod migrate 521–522 + deploy tip

> **Actualizado:** 2026-07-30 · **EJECUTADO** · tip live `3f10c272` · migs **521+522 APPLIED** · `claimReady: false` · canary **KILL ON**  
> **Histórico probe (2026-07-28):** 521/522 ausentes · 0 filas  
> **Post-apply (2026-07-30):** `_migrations` 521+522 · cols tracking OK · CHECK incluye `score_threshold` · smokes PASS

## Estado

| Campo | Valor |
|-------|-------|
| Migrate | **DONE** 2026-07-30T08:17Z |
| Deploy | **DONE** `3d76918b` · live `3f10c2729502` |
| Script one-shot | `scripts/run-prod-migrate-521-522.mjs` (PUBLIC URL) |

No re-aplicar 521/522 (idempotente / ya en `_migrations`).

---

## Orden seguro (histórico — ya cumplido)

```
1) Backup / snapshot
2) CEO SÍ + ADR-064 approval env
3) MIGRATE 521 → validate
4) MIGRATE 522 → validate   (mismo migrate:prod aplica ambas pendientes en orden)
5) DEPLOY tip repo (redeploy --from-source)  — solo tras validar 521+522
6) Health + smokes workflows/sequences (sin mass-send)
7) Logs / 5xx + confirmar canary KILL ON
```

**No** deploy-first. Tip actual **requiere** cols 521 para sequences; 522 para `score_threshold` create.

---

## 1. Preflight (lectura)

```powershell
git fetch origin
git rev-parse HEAD origin/main   # tip autorizado (hoy 0d7d6e90 — ver HANDOVER)

railway variables -s "@nelvyon/web" -e production --kv |
  Select-String "NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH|NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED|NELVYON_AI_ENABLED"
# Esperado: KILL=1 · PROD_CANARY=0 · AI=0

# Probe READ-ONLY (Postgres service PUBLIC URL)
railway run -s Postgres -e production -- node scripts/tmp-prod-mig-521-522-readonly.mjs
# Pre-migrate: migs=[] · sin email_* · score_threshold=false · volumes ~0
```

Pendientes en prod (tras 520): **solo** `521_*.sql` y `522_*.sql` (no hay 523+ en repo).

---

## 2. Backup / snapshot

```powershell
# A) Railway UI: Postgres → Volume → Snapshot  [CEO]
# B) pg_dump vía DATABASE_PUBLIC_URL (no loguear secretos)
# pg_dump "$env:DATABASE_PUBLIC_URL" --format=custom --file=nelvyon-prod-pre-521-522.dump
```

Retener ≥ 7 días.

---

## 3. Confirmación entorno + ADR-064

Escritura CEO: **«SÍ migrar producción 521 y 522»**.

Aprobar apply (temporales; quitar tras éxito):

```powershell
# En Railway @nelvyon/web production (o shell one-shot):
# NELVYON_PROD_MIGRATE_APPROVED=1
# NELVYON_PROD_MIGRATE_APPROVED_BY=<nombre-ceo>
# NELVYON_PROD_MIGRATE_COMMIT_SHA=0d7d6e90   # opcional pero recomendado (tip HANDOVER)
```

Sin estas vars, `migrate.ts` / `migrate:prod` **rechazan** apply en production (ADR-064).

---

## 4–7. Aplicar y validar 521 luego 522

Comando canónico (aplica **todas** las pendientes en orden lexicográfico → 521 luego 522):

```powershell
# Usar DATABASE_URL alcanzable (PUBLIC del servicio Postgres, o railway run en red interna).
# Ejemplo one-shot con URL pública del plugin Postgres (no imprimir la URL):
railway run -s Postgres -e production -- pwsh -Command '
  $env:DATABASE_URL = $env:DATABASE_PUBLIC_URL
  $env:NELVYON_DEPLOY_ENV = "production"
  $env:NELVYON_PROD_MIGRATE_APPROVED = "1"
  $env:NELVYON_PROD_MIGRATE_APPROVED_BY = "<CEO>"
  $env:NELVYON_PROD_MIGRATE_COMMIT_SHA = "0d7d6e90"
  pnpm -C apps/web migrate:prod
'
```

Alternativa equivalente: `pnpm -C apps/web migrate` con el mismo gate/env (entrypoint `backend/db/migrate.ts`).

### Validar 521

```sql
SELECT name, executed_at FROM _migrations WHERE name LIKE '521%';
SELECT column_name FROM information_schema.columns
 WHERE table_name='saas_sequence_enrollments'
   AND column_name IN ('email_opened','email_clicked');
-- Esperado: 2 columnas + fila _migrations
```

### Validar 522

```sql
SELECT name FROM _migrations WHERE name LIKE '522%';
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conname='saas_workflows_trigger_type_check';
-- Debe incluir score_threshold
SELECT count(*) FROM saas_workflows WHERE trigger_type='score_threshold'; -- 0 OK
```

Re-probe: `railway run -s Postgres -e production -- node scripts/tmp-prod-mig-521-522-readonly.mjs`

---

## 8. Deploy production (solo tras migrate OK)

```powershell
railway redeploy -s "@nelvyon/web" -e production --from-source -y
```

Quitar vars de aprobación ADR-064 tras migrate exitoso (evitar applies accidentales).

---

## 9–12. Health / smokes / logs

```powershell
Invoke-WebRequest https://nelvyon.com/api/health -UseBasicParsing
$env:CERT_BASE_URL="https://nelvyon.com"
node scripts/reval-workflows-staging.mjs
node scripts/smoke-sequences-staging.mjs
railway logs -s "@nelvyon/web" -e production
# Sin mass-send · buscar 5xx / SCHEMA_MISMATCH
```

---

## 13. Rollback exacto

### 522 → CHECK previo (sin score_threshold)

```sql
BEGIN;
ALTER TABLE saas_workflows DROP CONSTRAINT IF EXISTS saas_workflows_trigger_type_check;
ALTER TABLE saas_workflows ADD CONSTRAINT saas_workflows_trigger_type_check
  CHECK (trigger_type IN (
    'contact_created','contact_updated','stage_changed','deal_stage_changed',
    'job_completed','manual','scheduled','form_submitted','tag_added',
    'email_opened','email_clicked','webhook_in','date_reached',
    'sequence_enrolled','review_received'
  ));
COMMIT;
```

### 521 → DROP columnas

```sql
BEGIN;
ALTER TABLE saas_sequence_enrollments DROP COLUMN IF EXISTS email_clicked;
ALTER TABLE saas_sequence_enrollments DROP COLUMN IF EXISTS email_opened;
COMMIT;
```

Si el tip **nuevo** ya está live: **rollback código primero** (redeploy tip pre-521), luego DROP columnas.

---

## 14. Canary KILL ON (no abrir)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

---

## Compatibilidad post-migrate

| Superficie | Tras 521+522 |
|------------|--------------|
| Sequences SELECT/INSERT tracking | OK |
| Track open/click UPDATE | OK |
| Workflows `score_threshold` create | OK (201) |
| Resto triggers / CRM | Sin cambio de contrato |

## Riesgos (datos reales)

| Mig | Volumen | Incompatibles | Lock | Duración |
|-----|---------|---------------|------|----------|
| 521 | 0 rows | N/A | breve | **&lt;1 s** |
| 522 | 0 rows | **0** | ACCESS EXCLUSIVE CHECK | **&lt;1 s** |

## Prohibido

Mass-send · canary ON · OAuth/Twilio/Ads/payouts · claimReady true · costes · migrate/deploy sin SÍ CEO.
