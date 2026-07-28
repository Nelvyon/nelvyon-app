# Runbook — Prod migrate 521–522 + deploy tip (NO ejecutar sin CEO SÍ)

> **Fecha:** 2026-07-28 · tip código `ebfed0c1`  
> **claimReady: false** · canary **KILL ON**  
> **Estado probe prod (READ-ONLY):** 521/522 **AUSENTES** · cols enrollment tracking **AUSENTES** · CHECK sin `score_threshold` · volumen enrollments/sequences/workflows = **0** · filas incompatibles `score_threshold` = **0**

## Orden seguro (obligatorio)

```
1) MIGRATE 521 → validate
2) MIGRATE 522 → validate
3) DEPLOY tip ebfed0c1 (o confirmar deploy ya live)
4) Health + smokes
```

**No** desplegar tip con SELECT/UPDATE `email_opened`/`email_clicked` **antes** de 521.  
Si un auto-deploy de `main` ya está BUILDING: **pausar/cancelar** o aplicar 521–522 **antes** de que el release sirva tráfico (ventana de riesgo).

---

## 1. Preflight (lectura)

```powershell
git rev-parse HEAD origin/main   # debe ser ebfed0c1 (o tip autorizado)
railway variables -s "@nelvyon/web" -e production --kv |
  Select-String "NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH|NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED|NELVYON_AI_ENABLED"
# Esperado: KILL=1 · PROD_CANARY=0 · AI=0

# Probe READ-ONLY (usa DATABASE_PUBLIC_URL del servicio Postgres)
railway run -s Postgres -e production -- node scripts/tmp-prod-mig-521-522-readonly.mjs
# Esperado pre-migrate: migs_521_522=[] · cols sin email_* · check_includes_score_threshold=false · volumes 0
```

Confirmar entorno: servicio `@nelvyon/web` · environment **production** · DB service **Postgres**.

---

## 2. Backup / snapshot

Antes de ALTER:

```powershell
# Opción A — snapshot Railway volume (UI: Postgres → Volume → Snapshot)  [CEO]
# Opción B — dump lógico (requiere DATABASE_PUBLIC_URL; no loguear secretos)
# pg_dump "$DATABASE_PUBLIC_URL" --format=custom --file=nelvyon-prod-pre-521-522.dump
```

Retener dump ≥ 7 días o snapshot Railway.

---

## 3. Confirmación entorno production

```powershell
railway status -e production -s "@nelvyon/web"
# Online · url https://nelvyon.com
```

Escritura verbal CEO: **«SÍ migrar producción 521 y 522»**.

---

## 4. Aplicar 521

```powershell
# Desde monorepo, con DATABASE_URL = prod (PUBLIC o railway run interno en release)
# Preferido: railway run -s "@nelvyon/web" -e production -- pnpm -C apps/web migrate
# O aplicar SQL único si el migrator soporta one-file — usar el migrator estándar del repo.
railway run -s "@nelvyon/web" -e production -- pnpm -C apps/web exec tsx ../../backend/db/migrate.ts
# (ajustar al entrypoint real de migrate del proyecto si difiere)
```

SQL (referencia; el migrator aplica el archivo):

```sql
-- 521_saas_sequence_enrollment_tracking.sql
ALTER TABLE saas_sequence_enrollments
  ADD COLUMN IF NOT EXISTS email_opened BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_clicked BOOLEAN NOT NULL DEFAULT false;
```

---

## 5. Validar 521

```sql
SELECT name, executed_at FROM _migrations WHERE name LIKE '521%';
SELECT column_name FROM information_schema.columns
 WHERE table_name='saas_sequence_enrollments'
   AND column_name IN ('email_opened','email_clicked');
-- Esperado: 2 columnas + fila en _migrations
```

---

## 6. Aplicar 522

Mismo migrator (siguiente archivo):

```sql
-- 522 — DROP+ADD CHECK incluyendo score_threshold (ver archivo en repo)
```

---

## 7. Validar 522

```sql
SELECT name FROM _migrations WHERE name LIKE '522%';
SELECT pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conname='saas_workflows_trigger_type_check';
-- Debe incluir score_threshold
SELECT count(*) FROM saas_workflows WHERE trigger_type='score_threshold';
-- Debe ser 0 o filas válidas post-CHECK
```

---

## 8. Deploy production

```powershell
# Solo tras 521+522 validados
railway redeploy -s "@nelvyon/web" -e production --from-source -y
# o dejar que el deploy pendiente termine SI migrate ya aplicado
```

---

## 9. Health checks

```powershell
Invoke-WebRequest https://nelvyon.com/api/health -UseBasicParsing
# 200 status=ok
```

---

## 10–11. Smoke workflows / sequences (prod, sin mass-send)

```powershell
$env:CERT_BASE_URL="https://nelvyon.com"
node scripts/reval-workflows-staging.mjs   # apunta a CERT_BASE_URL
node scripts/smoke-sequences-staging.mjs
# wf.create score_threshold → 201; seq.create_draft → 201; sin envío SES masivo
```

---

## 12. Logs / 5xx

```powershell
railway logs -s "@nelvyon/web" -e production
# Buscar 5xx / SCHEMA_MISMATCH / relation does not exist
```

---

## 13. Rollback exacto

### 522 (CHECK)

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
-- Opcional: DELETE FROM _migrations WHERE name='522_saas_workflows_score_threshold_trigger.sql';
COMMIT;
```

### 521 (columnas)

```sql
BEGIN;
ALTER TABLE saas_sequence_enrollments DROP COLUMN IF EXISTS email_clicked;
ALTER TABLE saas_sequence_enrollments DROP COLUMN IF EXISTS email_opened;
-- Opcional: DELETE FROM _migrations WHERE name='521_saas_sequence_enrollment_tracking.sql';
COMMIT;
```

**Atención:** si el tip desplegado **lee** esas columnas, rollback 521 **sin** rollback de código provoca 500 en sequences. Orden rollback: **redeploy tip pre-521** → luego DROP columnas → (opcional) revert CHECK.

### Deploy

```powershell
railway redeploy -s "@nelvyon/web" -e production --yes
# o redeploy deployment ID conocido pre-cambio
```

---

## 14. Canary KILL ON (confirmar, no abrir)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

---

## Riesgos (datos reales 2026-07-28)

| Mig | Volumen | Filas incompatibles | Lock | Duración estimada |
|-----|---------|---------------------|------|-------------------|
| 521 | 0 enrollments (~40 KB) | N/A | breve ACCESS EXCLUSIVE posible | **&lt; 1 s** |
| 522 | 0 workflows (~32 KB) | **0** `score_threshold` | ACCESS EXCLUSIVE CHECK | **&lt; 1 s** |

## Prohibido en este runbook

Mass-send · canary ON · OAuth/Twilio/Ads/payouts · claimReady true · costes nuevos.
