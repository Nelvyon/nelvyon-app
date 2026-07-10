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
| **Estado** | ❌ `VerificationStatus: PENDING`, `SendingEnabled: false` |
| **Consola** | AWS SES → Verified identities → nelvyon.com |
| **Acción DNS** | Añadir registro **TXT** en Cloudflare DNS con token de verificación SES |
| **Token actual** | Visible en consola SES (no copiar en docs) |
| **Verificación** | SES muestra **Verified**; `SendingEnabled: true` |
| **Bloquea Fase 1 100%** | **Sí** — sin dominio verificado no hay email prod real |

---

## 5. AWS — Solicitar acceso producción SES (CRÍTICO)

| Campo | Valor |
|-------|-------|
| **Estado** | ❌ `ProductionAccessEnabled: false` (sandbox: solo emails verificados) |
| **Consola** | AWS SES → Account dashboard → **Request production access** |
| **Datos** | Caso de uso: SaaS B2B transaccional + campañas opt-in |
| **Verificación** | `aws sesv2 get-account` → `ProductionAccessEnabled: true` |
| **Bloquea Fase 1 100%** | **Sí** para campañas a audiencias reales |

---

## 6. AWS — SNS SES subscription (bounces)

| Campo | Valor |
|-------|-------|
| **Estado** | ❌ 0 SNS subscriptions activas |
| **Consola** | AWS SES → Notifications → configurar bounce/complaint → SNS → confirmar subscription al webhook `https://nelvyon.com/api/webhooks/ses` |
| **Referencia** | KI-011 |
| **Bloquea Fase 1 100%** | Sí para reputación email enterprise |

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
| SES dominio verificado | **Crítica** | **Sí** |
| SES production access | **Crítica** | **Sí** |
| Primer backup workflow | Alta | **Sí** |
| SNS SES confirm | Alta | Sí (bounces) |
| Redeploy prod Railway | Alta | No (pero recomendado) |
| PRODUCTION_BASE_URL | — | ✅ Hecho |
| `CRON_SECRET` | — | ✅ Sincronizado Railway + GitHub (2026-07-10) |
| Inventario secretos / legacy cleanup | — | ✅ `docs/PRODUCTION_SECRETS.md` |
| DATABASE_PUBLIC_URL (GitHub) | — | ✅ Backups CI |
| Sentry | Baja | No |
| Cloudflare WAF | Baja | No |
