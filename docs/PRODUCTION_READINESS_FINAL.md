# NELVYON — Production Readiness Final

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Objetivo lunes:** 8 de junio de 2026 — Go/No-Go producción real  
**Alcance:** Infraestructura compartida + OS entregables + previews autónomos + calidad servicios  
**Congelado:** Nuevas fases OS · SaaS · Portal — solo ops y configuración  
**Sin cambios de código en este bloque**

---

## 1. Resumen ejecutivo

| Área | Estado código | Estado prod | Bloqueante lunes |
|------|---------------|-------------|------------------|
| **Supabase (DB + Storage)** | ✅ Integrado | ⚠️ Config manual | Bucket + creds API |
| **Railway (Web + API)** | ✅ Docker + healthchecks | ⚠️ Variables | 5 vars OS + redeploy |
| **SendGrid** | ✅ `EmailService` | ⚠️ API key | Remitente verificado |
| **Bucket `os-deliverables`** | ✅ Upload/sign | ❌ Crear en prod | P0 |
| **Autonomous previews** | ✅ Phase H + I | ⚠️ Bucket staging | P1 interno |
| **Variables entorno** | ✅ Documentadas | ⚠️ Pegar Railway | P0 |

**Veredicto:** Código **listo**. Producción real depende **100% de configuración ops** este lunes. Sin `SUPABASE_*` el upload es mock; sin `SENDGRID_*` los emails quedan en cola.

---

## 2. Auditoría Supabase

### 2.1 Postgres (DATABASE_URL)

| Item | Estado | Acción lunes |
|------|--------|--------------|
| Migraciones 315–322 | ✅ en repo | `pnpm migrate:prod` o release command Web |
| `validate:os-core-migrations` | ✅ script | Ejecutar contra prod DB |
| RLS tablas `os_*` (322) | ✅ migración | Verificar `relrowsecurity = true` |
| Backfill clients/projects | ✅ 0 legacy dev | Dry-run prod si hay datos |

**Connection string:** Supabase → Settings → Database → URI pooler (service role para migraciones Web).

### 2.2 Storage

| Bucket | Privado | Uso | Variable |
|--------|---------|-----|----------|
| `os-deliverables` | **Sí** | Upload OS + signed URL portal | `OS_DELIVERABLES_BUCKET` (default OK) |
| `autonomous-previews` | **Sí** | Phase I staging CDN | `AUTONOMOUS_PREVIEWS_BUCKET` |
| `websites` | Sí | Export web estático (futuro) | — |

**Reglas:**

- No políticas lectura pública en `os-deliverables`
- Upload/download vía `SUPABASE_SERVICE_ROLE_KEY` solo en **servicio API**
- **Nunca** `SUPABASE_SERVICE_ROLE_KEY` en servicio Web público

### 2.3 Checklist Supabase

- [ ] Proyecto prod identificado (no staging keys en prod)
- [ ] Bucket `os-deliverables` creado y privado
- [ ] Bucket `autonomous-previews` creado (staging interno)
- [ ] `SUPABASE_URL` copiado a Railway API
- [ ] `SUPABASE_SERVICE_ROLE_KEY` copiado a Railway API (secreto)
- [ ] Migración 322 aplicada
- [ ] `validate:os-core-migrations` → OK

---

## 3. Auditoría Railway

### 3.1 Servicios

| Servicio | Root | Healthcheck | Release |
|----------|------|-------------|---------|
| **Web** | `apps/web/` | `/api/health/live` | `migrate.ts` |
| **API** | `backend/` | `/health` | — |

Configs: `railway.json`, `apps/web/railway.json`, `backend/railway.json`.

### 3.2 Variables Web (obligatorias)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Migraciones + Prisma/pg |
| `JWT_SECRET` | Auth cookie (≥ 32 chars) |
| `NEXT_PUBLIC_API_BASE_URL` | Llamadas FastAPI |
| `NEXT_PUBLIC_APP_URL` | URLs absolutas |
| `OPENAI_API_KEY` | Agentes OS LLM |

### 3.3 Variables API (obligatorias OS prod)

| Variable | Uso | Sin ella |
|----------|-----|----------|
| `DATABASE_URL` | Postgres async | ❌ No arranca |
| `JWT_SECRET_KEY` | Auth + portal | ❌ Auth falla |
| `SUPABASE_URL` | Storage | ⚠️ Mock upload |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage | ⚠️ Mock upload |
| `SENDGRID_API_KEY` | Emails OS | ⚠️ Cola `no_api_key` |
| `SENDGRID_FROM_EMAIL` | Remitente | ⚠️ Cola |
| `FRONTEND_APP_URL` | Links email portal | ⚠️ Links rotos |
| `OS_DELIVERABLES_BUCKET` | Bucket name | Default OK |

### 3.4 Checklist Railway

- [ ] Web desplegado — `GET /api/health/live` → 200
- [ ] API desplegado — `GET /health` → 200
- [ ] Release command migraciones ejecutado (logs Release)
- [ ] Variables API §3.3 configuradas
- [ ] `NEXT_PUBLIC_API_BASE_URL` apunta a URL API real
- [ ] Redeploy API tras pegar variables

---

## 4. Auditoría SendGrid

| Componente | Ubicación |
|------------|-----------|
| Servicio | `backend/services/email_service.py` |
| Orquestación OS | `backend/services/os_notification_service.py` |

### 4.1 Eventos automáticos OS

| Evento | Trigger |
|--------|---------|
| Invitación portal | `POST /portal/invites` |
| Entregable publicado | Workflow publish |
| Revisión solicitada | Portal reject |
| Nueva revisión interna | create-revision |

### 4.2 Setup SendGrid

1. Crear API Key con permiso **Mail Send**
2. Verificar dominio o single sender (`SENDGRID_FROM_EMAIL`)
3. Configurar en Railway API:
   ```env
   SENDGRID_API_KEY=SG.xxx
   SENDGRID_FROM_EMAIL=noreply@tudominio.com
   FRONTEND_APP_URL=https://app.nelvyon.com
   ```

### 4.3 Checklist SendGrid

- [ ] API Key creada
- [ ] Remitente verificado (DNS o single sender)
- [ ] Test invite portal → email recibido
- [ ] Test publish entregable → email recibido
- [ ] Logs sin `no_api_key`

---

## 5. Auditoría bucket `os-deliverables`

| Capa | Endpoint | Estado código |
|------|----------|---------------|
| Upload operador | `POST /os/deliverables/{id}/upload` | ✅ |
| Download portal | `GET /portal/deliverables/{id}/download` | ✅ Signed URL ~600s |
| UI upload | `/os/entregables/{id}` | ✅ |
| Mock sin Supabase | `storage_key` sin archivo | ⚠️ Dev only |

### Flujo verificación lunes

1. Subir PDF test desde OS
2. Verificar objeto en Supabase Storage → `os-deliverables/`
3. Login portal cliente → descargar → 302 signed URL
4. Confirmar TTL y expiración

- [ ] Upload OK con archivo real en Storage
- [ ] Download portal OK
- [ ] Sin URL pública permanente

---

## 6. Auditoría Autonomous previews

| Phase | Script | Output | Prod |
|-------|--------|--------|------|
| **H** | `pnpm autonomous:phase-h` | `preview.html` local | ✅ Offline QA |
| **I** | `pnpm autonomous:phase-i` | CDN staging bucket | ⚠️ Gate env |

### Variables Phase I

| Variable | Default | Prod |
|----------|---------|------|
| `AUTONOMOUS_STAGING_DEPLOY` | `false` | `true` solo staging |
| `DEPLOY_DRY_RUN` | `true` | `false` para upload |
| `AUTONOMOUS_PREVIEWS_BUCKET` | `autonomous-previews` | Crear en Supabase |
| `AUTONOMOUS_PLAYWRIGHT_QA` | — | `1` en CI/staging |

**Reglas:**

- Previews **nunca** `client_visible` automático
- `osPublishPayload.json` siempre `dry_run=true` hasta QA ≥ 85
- No dominio cliente final desde autonomous

### Checklist previews

- [ ] Phase H ejecuta sin error (restaurant piloto)
- [ ] `qaReport.json` score documentado
- [ ] Bucket `autonomous-previews` creado
- [ ] Phase I mock o real según creds
- [ ] URL staging solo uso interno

---

## 7. Variables necesarias — matriz completa

### P0 — Lunes (OS prod)

| Variable | Servicio | Fuente |
|----------|----------|--------|
| `DATABASE_URL` | Web + API | Supabase |
| `JWT_SECRET` / `JWT_SECRET_KEY` | Web / API | Generar 32+ chars |
| `SUPABASE_URL` | API | Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | API | Supabase (secreto) |
| `SENDGRID_API_KEY` | API | SendGrid |
| `SENDGRID_FROM_EMAIL` | API | SendGrid verified |
| `FRONTEND_APP_URL` | API | Dominio app |
| `NEXT_PUBLIC_API_BASE_URL` | Web | URL Railway API |

### P1 — Semana 1 (calidad servicios)

| Variable | Uso |
|----------|-----|
| `OPENAI_API_KEY` | Agentes autónomos + ads |
| `OAUTH_ENCRYPTION_KEY` | Tokens cliente Google/Meta |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth web |
| `META_APP_ID/SECRET` | OAuth web |
| `AUTONOMOUS_STAGING_DEPLOY` | Previews CDN |

### P2 — Post-lunes (ads launch real)

Ver `ADS_AGENTS_ROADMAP.md` §9: `GOOGLE_ADS_*`, `META_ACCESS_TOKEN`, etc.

### P3 — No bloqueante lunes

Stripe, PostHog, Sentry, Twilio, TikTok — fuera alcance Go-Live OS.

---

## 8. Checklist final — Lunes 8 junio 2026

### Mañana (infra) — ~45 min

| # | Tarea | ✓ |
|---|-------|---|
| 1 | Aplicar migración 322 prod (`pnpm migrate:prod`) | [ ] |
| 2 | `pnpm validate:os-core-migrations` → OK | [ ] |
| 3 | Crear bucket `os-deliverables` privado | [ ] |
| 4 | Crear bucket `autonomous-previews` privado | [ ] |
| 5 | Pegar variables Railway API (§3.3) | [ ] |
| 6 | Confirmar `DATABASE_URL` + `JWT_SECRET` Web | [ ] |
| 7 | Redeploy API + Web | [ ] |

### Mediodía (verificación) — ~45 min

| # | Tarea | ✓ |
|---|-------|---|
| 8 | Health Web `/api/health/live` → 200 | [ ] |
| 9 | Health API `/health` → 200 | [ ] |
| 10 | Crear cliente OS test | [ ] |
| 11 | Crear proyecto + entregable | [ ] |
| 12 | Upload archivo → visible en Supabase Storage | [ ] |
| 13 | Invitar portal → email SendGrid recibido | [ ] |
| 14 | Portal login → download entregable OK | [ ] |
| 15 | Approve/reject → email notificación | [ ] |

### Tarde (autonomous + calidad) — ~30 min

| # | Tarea | ✓ |
|---|-------|---|
| 16 | `pnpm autonomous:phase-h` → preview.html OK | [ ] |
| 17 | QA report score documentado | [ ] |
| 18 | Phase I dry-run o staging upload | [ ] |
| 19 | Revisar `TEMPLATE_LIBRARY_MASTER.md` — prioridades P0 | [ ] |
| 20 | Revisar `ADS_AGENTS_ROADMAP.md` — no launch sin OAuth | [ ] |

### Go/No-Go (17:00)

| Criterio | GO | NO-GO |
|----------|-----|-------|
| Migraciones 315–322 OK | ✓ | Cualquier fallo validate |
| Upload real Storage | ✓ | Solo mock |
| Email invite recibido | ✓ | Cola `no_api_key` |
| Portal download OK | ✓ | 404/403 |
| Smoke 24 pytest (staging) | ✓ | Regresión |

**Decisión:** _______________  
**Responsable:** _______________

---

## 9. Riesgos residuales

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| Service role en Web por error | Baja | Crítico | Solo API; audit variables |
| Bucket público por misconfig | Media | Alto | Checklist §5 privado |
| SendGrid spam / no verificado | Media | Medio | DNS + warm-up |
| Mock upload invisible | Alta | Alto | Test archivo real lunes |
| Ads launch accidental | Media | Alto | Congelar `launch=true`; roadmap §10 |
| Legacy data sin backfill | Baja | Medio | Dry-run prod |

---

## 10. Documentos relacionados

| Doc | Contenido |
|-----|-----------|
| `OS_PRODUCTION_GO_LIVE_CHECKLIST.md` | Detalle paso a paso OS |
| `OS_PRODUCTION_READINESS.md` | Informe cierre 2026-06-07 |
| `OS_SMOKE_TEST_FINAL.md` | 24 pytest + manual |
| `OS_RLS_AUDIT.md` | Políticas 322 |
| `autonomous/TEMPLATE_LIBRARY_MASTER.md` | Biblioteca plantillas |
| `autonomous/ADS_AGENTS_ROADMAP.md` | Agentes ads |
| `autonomous/AUTONOMOUS_PHASE_H_LANDING_PREVIEW_STAGING.md` | Preview local |
| `autonomous/AUTONOMOUS_PHASE_I_STAGING_DEPLOY.md` | CDN staging |

---

## 11. Post-lunes — foco calidad (sin nuevas fases OS/SaaS/Portal)

1. Poblar 24 plantillas P0 (`TEMPLATE_LIBRARY_MASTER.md` semana S1)
2. OAuth cliente Google/Meta (`ADS_AGENTS_ROADMAP.md` fase B)
3. Enforce QA score ≥ 85 antes de publish OS
4. Portfolio evidencias por sector (`NELVYON_PORTFOLIO_STRUCTURE.md`)

**Éxito lunes = infra verde + un flujo cliente completo real (upload → email → portal → download).**
