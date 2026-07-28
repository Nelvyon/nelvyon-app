# SECURITY OPERATIONS — NELVYON

> **Actualizado:** 2026-07-29 · **claimReady: false** · sin secretos en este archivo  
> Inventario de variables: [`../PRODUCTION_SECRETS.md`](../PRODUCTION_SECRETS.md) · Índice: [`OPERATIONS_INDEX.md`](./OPERATIONS_INDEX.md)

Documento de **seguridad operativa** (cómo operar el control plane), no threat model de producto.  
Threat model: [`../PHASE2_THREAT_MODEL_ELITE.md`](../PHASE2_THREAT_MODEL_ELITE.md).

---

## 1. Secretos y variables

| Principio | Práctica |
|-----------|----------|
| Fuente de verdad | Railway (runtime) + GitHub Secrets (CI) |
| Validación boot | `backend/config/prodEnvValidation.ts` → `/api/health/ready` |
| Escaneo | `.gitleaks.toml` + workflow `security-gates.yml` |
| Prohibido | Secretos en git, issues, HANDOVER, evidencias |

### Rotación (procedimiento)

| Secreto | Impacto al rotar | Pasos |
|---------|------------------|-------|
| `JWT_SECRET` | Invalida sesiones SaaS | Generar ≥32 chars → Railway Web+API mismo valor → redeploy → login smoke → revocar viejo |
| `CRON_SECRET` | Rompe crons GH↔app | Actualizar Railway **y** GitHub Secret al unísono → smoke un cron |
| `TRACKING_SECRET` | Invalid tokens open/click antiguos | Actualizar → aceptar pérdida de pixels viejos |
| `STRIPE_WEBHOOK_SECRET` | Webhooks 400 | Stripe Dashboard → nuevo endpoint secret → Railway → test event |
| `SES_*` / IAM | Email down | IAM new key → Railway `SES_*` → revoke old → send test autorizado |
| `OAUTH_ENCRYPTION_KEY` | No rotar a ciegas | Requiere re-cifrado tokens — **CEO/ops plan** |
| `DATABASE_URL` | Outage total | Solo con ventana + rollback URL |

Checklist sync: `PRODUCTION_SECRETS.md` §9.

**Mejora futura (sin coste de código):** calendario trimestral de rotación en ops (calendario humano). **No** añadir vault de pago.

---

## 2. Permisos y roles (SaaS)

| Capa | Mecanismo |
|------|-----------|
| Auth | JWT cookie httpOnly · `authenticate` |
| Tenant | `requireSaasContext` · membership / owner |
| RBAC roles | `saasRbac` (owner/admin/member/…) |
| Custom ACL | `SaasSecurityEnterpriseService.getCustomPermissions` |
| Acciones sensibles | Export CRM, GDPR tenant, contracts/memberships write, reports generate → permisos elevados |

**Fail-closed (2026-07-29):** si falla la lectura de custom ACL o IP allowlist (error transitorio DB), la API responde **`503 SECURITY_UNAVAILABLE`** — no degrada a “permitir”.  
Tablas ausentes (`42P01`) siguen permitiendo fallback a RBAC de rol (pre-mig 482).

---

## 3. RLS / multi-tenant

| Regla | Detalle |
|-------|---------|
| `DATABASE_URL` | Service role / URL que bypasea RLS solo en servidor — **nunca** anon en backend |
| Tenant isolation | Queries siempre filtran `tenant_id` en servicios SaaS |
| Local AI / RAG | Role `nelvyon_local_ai_app` + RLS FORCE en prep prod — ver runbooks RAG |
| Auditoría | `OS_RLS_AUDIT.md` · evidencias `ki026_rls_isolation` |

**No** desactivar RLS en prod para “arreglar” un bug — corregir política o query.

---

## 4. Fail-closed (superficies críticas)

| Superficie | Comportamiento |
|------------|----------------|
| Security control plane | 503 si ACL/IP lookup falla |
| Schema drift | `SCHEMA_MISMATCH` 503 sin filtrar nombres de tabla |
| Private AI canary | 403 `PRIVATE_AI_CANARY_BLOCKED` si flags no abren ventana |
| Campaign launch | Gates técnicos/legales; bypass solo test |
| Prod env validation | Ready falla si faltan críticos |

---

## 5. Rate limits

| Capa | Implementación | Límite multi-réplica |
|------|----------------|----------------------|
| Middleware IP | `apps/web/src/lib/security/rateLimit.ts` + Upstash si vars presentes | Redis si `UPSTASH_*` |
| Fallback | In-memory | **Por instancia** — caveat HA |
| SaaS sensibles | export/import, GDPR, launch, webhook-in, audit | Misma capa |

**Mejora futura (0€ primero):** endurecer límites; durable webhook idempotency en Postgres si se escala horizontalmente (hoy process-local).

---

## 6. Backups y restauración

| Pieza | Estado |
|-------|--------|
| Backup semanal GH | `db-backup.yml` · artifact 30d |
| Drill | `scripts/run-postgres-restore-drill.mjs` · **solo no-prod** |
| Runbook | [`POSTGRES_RESTORE_DRILL.md`](./POSTGRES_RESTORE_DRILL.md) |
| RPO/RTO | ≤24h / ≤4h documentados en HA/DR |

**Prohibido:** restore destructivo a prod sin SÍ CEO + drill evidenciado.

---

## 7. Headers / correlación / superficie HTTP

| Control | Dónde |
|---------|-------|
| `x-request-id` | Middleware `apps/web/src/middleware.ts` |
| Security headers | `applySecurityHeaders` |
| Error body SaaS | `saasErrorBody(..., { requestId })` |
| Auth API keys | Tenant keys cifradas · no loguear secretos |

---

## 8. Mejoras futuras (documentadas — no implementadas aquí)

| Mejora | Requiere |
|--------|----------|
| Idempotency webhook-in en Postgres | Mig + decisión; 0€ infra |
| Rate limit 100% Redis en multi-réplica | `UPSTASH_*` ya opcional |
| Vault / 1Password Business | Coste / decisión CEO |
| WAF / bot management | Coste / DNS |
| PagerDuty / on-call 24/7 | Coste + gente |
| Rotación automática IAM | Política AWS CEO |

Ninguna de estas bloquea operar staging ni el gate de migrate documentado.
