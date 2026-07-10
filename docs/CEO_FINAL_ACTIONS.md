# CEO — Acciones manuales finales (Fase 1)

> Checklist único para cerrar activaciones externas. **No incluye secretos reales.**  
> Actualizado: **2026-07-10**

Ejecutar en orden. Marcar cada ítem al completar.

---

## 1. GitHub — Backups producción

| Campo | Valor |
|-------|-------|
| **Estado** | 🟡 Secret `DATABASE_URL` usa hostname **interno** Railway — backup falló |
| **Acción requerida** | Añadir secret `DATABASE_PUBLIC_URL` con URL **pública** de Postgres |
| **Consola GitHub** | https://github.com/Nelvyon/nelvyon-app/settings/secrets/actions |
| **Dónde obtenerlo** | Railway → production → Postgres → **Connect** → **Public Network** → copy URL |
| **Nombre secret** | `DATABASE_PUBLIC_URL` (preferido) o reemplazar `DATABASE_URL` por URL pública |
| **Verificación** | Actions → `Database Backup` → Run workflow → SUCCESS + artifact |
| **Bloquea Fase 1 100%** | **Sí** |

---

## 2. GitHub — URL producción para crons

| Campo | Valor |
|-------|-------|
| **Estado** | ✅ `PRODUCTION_BASE_URL=https://nelvyon.com` (2026-07-10) |
| **Verificación** | Production Cron Executor SUCCESS en logs |

---

## 3. GitHub — Cron secret

| Campo | Valor |
|-------|-------|
| **Estado** | ✅ `CRON_SECRET` configurado; crons schedule SUCCESS |
| **Verificación opcional** | `curl -H "x-cron-secret: $CRON_SECRET" https://nelvyon.com/api/cron/status-check` → 200 |

---

## 4. AWS — Verificar dominio SES nelvyon.com (CRÍTICO)

| Campo | Valor |
|-------|-------|
| **Estado** | ❌ `VerificationStatus: PENDING`, `ErrorType: HOST_NOT_FOUND` — **falta DNS** |
| **Causa** | `_amazonses.nelvyon.com` TXT no existe en Cloudflare |
| **Guía** | `docs/SES_PRODUCTION_SETUP.md` §1 |
| **Automatizable** | `node scripts/apply-ses-dns-cloudflare.mjs` (requiere `CLOUDFLARE_API_TOKEN`) |
| **Manual** | Cloudflare → DNS → 1 TXT + 3 CNAME DKIM (proxy OFF) |
| **Verificación** | `node scripts/audit-ses-production.mjs` → Domain SUCCESS |

---

## 5. AWS — Solicitar acceso producción SES (CRÍTICO)

| Campo | Valor |
|-------|-------|
| **Estado** | ❌ `ProductionAccessEnabled: false`, **`ReviewDetails.Status: DENIED`** |
| **CaseId AWS** | `178372013800016` |
| **CLI intentado** | `put-account-details` — enviado, **rechazado por AWS** |
| **Consola** | [SES Account dashboard eu-west-1](https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/account) → **Request production access** / reopen case en Support |
| **Datos use-case** | Ver `docs/SES_PRODUCTION_SETUP.md` §2 |
| **Verificación** | `aws sesv2 get-account --region eu-west-1 --query ProductionAccessEnabled` → `true` |

---

## 6. AWS — SNS SES subscription (bounces)

| Campo | Valor |
|-------|-------|
| **Estado** | ✅ **COMPLETADO** (2026-07-10) |
| **Topic** | `arn:aws:sns:eu-west-1:354780327276:nelvyon-ses-events` |
| **Endpoint** | `https://nelvyon.com/api/webhooks/ses` — suscripción **confirmada** |
| **Config set** | `nelvyon-prod` → BOUNCE, COMPLAINT, DELIVERY |
| **Verificación** | `node scripts/audit-ses-production.mjs` |

---

## 7. Railway — Redeploy producción (recomendado)

| Campo | Valor |
|-------|-------|
| **Estado** | 🟡 Prod `git_sha: 30404800` vs repo `636a47bc` |
| **Consola** | Railway → proyecto `truthful-respect` → environment **production** → servicio Web |
| **Acción** | **Redeploy** último commit `main` (incluye fix middleware `/api/os/health`) |
| **Verificación** | `GET /api/health/live` → `git_sha` empieza por `636a47bc` |

---

## 8. Sentry — Alertas producción (recomendado)

| Campo | Valor |
|-------|-------|
| **Consola** | https://sentry.io |
| **Variables Railway Web** | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` (Python) |
| **Verificación** | Provocar error test; evento visible en Sentry |
| **Impacto si no** | Sin alertas automáticas de errores |
| **Bloquea Fase 1 100%** | No |

---

## 9. Cloudflare — WAF (recomendado)

| Campo | Valor |
|-------|-------|
| **Consola** | Cloudflare Dashboard → nelvyon.com → Security → WAF |
| **Referencia código** | `apps/web/cloudflare-waf-rules.md` |
| **Verificación** | Reglas activas; rate limit en `/api/auth/*` |
| **Impacto si no** | Protección edge manual incompleta |
| **Bloquea Fase 1 100%** | No |

---

## 10. Observabilidad externa (opcional)

| Ítem | Consola / servicio | Notas |
|------|-------------------|-------|
| Prometheus scrape | Self-hosted o Grafana Cloud | Target Python `/metrics` |
| Log drain | Railway → Datadog/Logtail | JSON stdout ya estructurado |
| Alertmanager | Cargar `backend/ops/alerts/phase9_alerts.yaml` | Requiere Prometheus |

---

## 11. Railway — SSH ops (opcional)

| Campo | Valor |
|-------|-------|
| **Acción** | `ssh-keygen -t ed25519` → `railway ssh keys add` |
| **Uso** | Debug prod, verify releaseCommand logs |
| **Referencia** | KI-009 |

---

## Restore drill (CEO / ops — trimestral)

1. Descargar artifact más reciente de `Database Backup`.
2. Restaurar en DB **staging vacía** (nunca prod directo):
   ```bash
   python backend/scripts/db_backup_restore.py restore \
     --backup-file ./backups/db_backup_YYYYMMDD.dump \
     --target-database-url "$STAGING_DATABASE_URL"
   ```
3. Smoke: `node scripts/run-staging-p0-smokes.mjs --skip-wait`
4. Documentar fecha en `docs/DEPLOYMENTS.md`.

**RPO objetivo documentado:** 7 días (backup semanal).  
**RTO objetivo documentado:** 4 h (restore manual + redeploy).

---

## Estado tras completar

| Acción | Prioridad | Bloquea 100% |
|--------|-----------|--------------|
| SES dominio verificado | **Crítica** | **Sí** — DNS Cloudflare (§4 CEO_FINAL_ACTIONS) |
| SES production access | **Crítica** | **Sí** — appeal caso DENIED (§5) |
| SNS SES webhook | — | ✅ Hecho 2026-07-10 |
| Redeploy prod Railway | Alta | No (pero recomendado) |
| PRODUCTION_BASE_URL | — | ✅ Hecho |
| `CRON_SECRET` | — | ✅ Sincronizado Railway + GitHub (2026-07-10) |
| Inventario secretos / legacy cleanup | — | ✅ `docs/PRODUCTION_SECRETS.md` |
| DATABASE_PUBLIC_URL (GitHub) | — | ✅ Backups CI |
| Sentry | Baja | No |
| Cloudflare WAF | Baja | No |
