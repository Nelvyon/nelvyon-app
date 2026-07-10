# CEO — Acciones manuales finales (Fase 1)

> Checklist único para cerrar activaciones externas. **No incluye secretos reales.**  
> Actualizado: **2026-07-10**

Ejecutar en orden. Marcar cada ítem al completar.

---

## 1. GitHub — Backups producción (obligatorio recomendado)

| Campo | Valor |
|-------|-------|
| **Consola** | https://github.com/Nelvyon/nelvyon-app/settings/secrets/actions |
| **Nombre** | `DATABASE_URL` |
| **Valor** | Connection string Postgres **producción** (preferible usuario read-only + `pg_dump`) |
| **Dónde obtenerlo** | Railway → servicio Postgres → `DATABASE_PUBLIC_URL` o `DATABASE_URL` |
| **Verificación** | Actions → `Database Backup` → Run workflow → job `pg_dump to artifact` SUCCESS + artifact descargable |
| **Impacto si no** | Sin backups off-site automatizados; RPO depende solo de Railway |
| **Bloquea Fase 1 100%** | No (código listo; ops incompleto) |

---

## 2. GitHub — URL producción para crons (obligatorio recomendado)

| Campo | Valor |
|-------|-------|
| **Consola** | https://github.com/Nelvyon/nelvyon-app/settings/variables/actions |
| **Nombre** | `PRODUCTION_BASE_URL` |
| **Valor** | `https://nelvyon.com` (sin trailing slash) |
| **Fallback actual** | `STAGING_BASE_URL` si no existe |
| **Verificación** | Actions → `Production Cron Executor` → último run SUCCESS; logs muestran URL nelvyon.com |
| **Impacto si no** | Crons pueden apuntar a staging si `STAGING_BASE_URL` ≠ prod |
| **Bloquea Fase 1 100%** | No si `STAGING_BASE_URL` ya es prod |

---

## 3. GitHub — Cron secret (verificar)

| Campo | Valor |
|-------|-------|
| **Consola** | Settings → Secrets → Actions |
| **Nombre** | `CRON_SECRET` |
| **Valor** | ≥16 chars; debe coincidir con Railway `@nelvyon/web` |
| **Verificación** | `curl -H "x-cron-secret: $CRON_SECRET" https://nelvyon.com/api/cron/status-check` → 200 |
| **Impacto si no** | Crons GitHub fallan 401 |
| **Bloquea Fase 1 100%** | Sí (si crons no funcionan en prod) |

---

## 4. AWS — SNS SES subscription (obligatorio para bounces)

| Campo | Valor |
|-------|-------|
| **Consola** | AWS SES → Configuration → Notifications → Amazon SNS |
| **Acción** | Confirmar subscription pendiente al webhook `https://nelvyon.com/api/webhooks/ses` |
| **Verificación** | Enviar email test; bounce aparece en logs; tabla `saas_email_bounces` |
| **Referencia** | KI-011 en `docs/KNOWN_ISSUES.md` |
| **Impacto si no** | Bounces no procesados; reputación email degradada |
| **Bloquea Fase 1 100%** | No código; sí ops email enterprise |

---

## 5. Sentry — Alertas producción (recomendado)

| Campo | Valor |
|-------|-------|
| **Consola** | https://sentry.io |
| **Variables Railway Web** | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` (Python) |
| **Verificación** | Provocar error test; evento visible en Sentry |
| **Impacto si no** | Sin alertas automáticas de errores |
| **Bloquea Fase 1 100%** | No |

---

## 6. Cloudflare — WAF (recomendado)

| Campo | Valor |
|-------|-------|
| **Consola** | Cloudflare Dashboard → nelvyon.com → Security → WAF |
| **Referencia código** | `apps/web/cloudflare-waf-rules.md` |
| **Verificación** | Reglas activas; rate limit en `/api/auth/*` |
| **Impacto si no** | Protección edge manual incompleta |
| **Bloquea Fase 1 100%** | No |

---

## 7. Observabilidad externa (opcional)

| Ítem | Consola / servicio | Notas |
|------|-------------------|-------|
| Prometheus scrape | Self-hosted o Grafana Cloud | Target Python `/metrics` |
| Log drain | Railway → Datadog/Logtail | JSON stdout ya estructurado |
| Alertmanager | Cargar `backend/ops/alerts/phase9_alerts.yaml` | Requiere Prometheus |

---

## 8. Railway — SSH ops (opcional)

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
| DATABASE_URL backup | Alta | No |
| PRODUCTION_BASE_URL | Alta | No* |
| CRON_SECRET verificado | Alta | Condicional |
| SNS SES confirm | Media | No |
| Sentry | Baja | No |
| Cloudflare WAF | Baja | No |
| Prometheus/logs externos | Opcional | No |

\* Bloquea solo si crons no apuntan a producción real.
