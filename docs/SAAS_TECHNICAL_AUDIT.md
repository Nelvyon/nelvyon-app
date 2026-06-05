# NELVYON SaaS — Auditoría técnica completa

**Fecha:** junio 2026 (actualizado tras Fase 3B)  
**Alcance:** producto SaaS tenant (`/saas/*`, `/api/saas/*`, `backend/saas/*`).  
**Excluido:** web pública/marketing (congelada), NELVYON OS interno (cerrado salvo lectura).  
**Método:** revisión de código, migraciones, tests, docs de fases 1A–3B y estado git.

---

## Resumen ejecutivo (honesto)

| Dimensión | Nota 0–10 | Veredicto |
|-----------|-----------|-----------|
| SaaS núcleo (onboarding, CRM, workflows, campañas) | **8.0** | CRM + pipeline deals CRUD en producto; falta RBAC, dashboard comercial y cierre legacy |
| CRM competitivo vs HubSpot/SF | **5.5** | Contactos + deals CRUD + kanban + dealsContext; sin secuencias ni reporting avanzado |
| Pipeline / deals SaaS | **8.0** | Backend 3A + UI 3B S1–S3–S5; kanban, KPIs y CRUD sobre `saas_deals`; sin drag-drop ni dashboard comercial |
| Automatizaciones | **6.0** | Workflows tenant reales; campañas simulan envío; drag-drop paralelo no integrado |
| IA en SaaS | **5.0** | Agentes potentes en OS/backend; poca IA integrada en flujo CRM SaaS |
| Onboarding | **7.0** | Wizard + API + bridge workspace completos |
| Billing comercial | **4.5** | Plan en onboarding; pagos/Stripe/cuotas parciales; dos sistemas factura |
| Permisos | **3.5** | Solo auth + tenant; sin roles dentro del tenant SaaS |
| Listo para producción comercial | **No** | Migraciones, ETL, deals, RBAC, billing enforcement |

**Tiempo realista hasta SaaS comercializable (SMB serio):** **10–14 semanas** de foco (1 dev full-time equivalente), asumiendo web pública congelada.

---

## 1. Qué módulos SaaS existen realmente

### 1.1 Núcleo tenant (App Router — producto principal)

| Módulo | Tablas DB | Servicio | API App | UI `/saas` | Tests |
|--------|-----------|----------|---------|------------|-------|
| Onboarding | `saas_tenants` | SaasOnboardingService | `/api/saas/onboarding/*` | `/saas/onboarding` | ✅ |
| CRM contactos | `saas_contacts`, `saas_contact_activities` | SaasCrmService | `/api/saas/crm/*` | `/saas/crm` | ✅ |
| Pipeline (legacy contacto) | `saas_contacts.pipeline_stage` | SaasCrmService | `/api/saas/crm/pipeline` | badge en tabla contactos | ✅ (deprecado UI) |
| Dashboard tenant | `saas_activity_log`, jobs, billing opcional | SaasDashboardService | `/api/saas/dashboard/*` | `/saas/dashboard` | ✅ |
| Workflows | `saas_workflows`, `saas_workflow_runs` | SaasWorkflowService | `/api/saas/workflows/*` | `/saas/workflows` | ✅ |
| Campañas | `saas_campanias`, recipients | SaasCampaniasService | `/api/saas/campanias/*` | `/saas/campanias` | ✅ |
| Deals (Fase 3A+3B) | `saas_deals` (312) | SaasDealsService | `/api/saas/deals/*` | `/saas/crm` pestaña Pipeline | ✅ |
| Reports | — | saas-reports | `/api/saas/reports/*` | parcial | parcial |

### 1.2 Infraestructura tenant

| Pieza | Estado |
|-------|--------|
| Bridge `saas_tenants.workspace_id` (310) | ✅ código + migración |
| RLS core SaaS (311) | ✅ contacts, workflows, campañas, activities |
| RLS deals (313) | ✅ migración local, **sin commit** |
| ETL contactos legacy → `saas_contacts` | ✅ SaasCrmEtlService + CLI |
| ETL deals legacy → `saas_deals` | ✅ SaasDealsEtlService + API (local) |
| Cuotas contactos (Python hybrid) | ✅ lectura; **no** enforcement en Node CRM POST |

### 1.3 Módulos extendidos (Pages Router — API sí, UI SaaS rara)

~20 servicios con tabla propia + tests: booking, cold-email, chatbot, heatmap, transcription, digital contracts, lead scoring, sentiment, A/B, briefing, profile, GDPR, notifications, chat, results, partners, whitelabel, invoicing (×2), analytics, template marketplace, drag-drop workflows.

**Patrón:** muchos usan `user_id` en lugar de `tenant_id` → aislamiento más débil que el núcleo.

### 1.4 Subpáginas `/saas/dashboard/*` (marketing operativo)

~19 rutas: leads, dialer, tiktok-ads, text2pay, web-builder, etc.

**Varias entran en modo mock** sin API keys (TikTok, Snapchat, Stripe/Twilio en text2pay). Son **cáscaras de integración**, no módulos SaaS terminados.

---

## 2. Qué está terminado vs incompleto

### ✅ Terminado (MVP real: DB + servicio + API + UI + tests)

1. Onboarding + creación tenant + bridge workspace  
2. CRM contactos (CRUD, actividades, búsqueda, pipeline por contacto)  
3. Workflows (CRUD, activate/pause/execute, runs)  
4. Campañas (CRUD, audiencia desde contactos, launch/stats)  
5. Dashboard tenant (resumen jobs, actividad, spend si hay `billing_payments`)  

### 🟡 Parcial (backend listo, producto incompleto)

| Área | Hecho | Falta |
|------|-------|-------|
| **Deals / pipeline oficial** | SaasDealsService, API, métricas, ETL, `dealsContext` en contacto GET | Commit, migración prod, UI kanban, sustituir pipeline de contactos |
| **Billing** | Plan en onboarding, tablas invoices, dashboard spend | Stripe enforcement, límites plan en API, facturación unificada |
| **Cuotas** | Python hybrid count | Enforcement en `POST /api/saas/crm/contacts`, modo `saas_only` |
| **ETL** | dry-run/apply contactos y deals | Ejecutar en prod, reportes de conflicto revisados |
| **Dashboard métricas** | DashboardMetricsService + GA4 + Pages API | Integrar en `/saas/dashboard` principal |
| **IA** | Agentes OS y jobs backend | Asistente en CRM/deals, resúmenes contacto en SaaS UI |
| **Permisos** | JWT + tenant resolution | Roles miembro/admin/viewer dentro del tenant |

### ❌ Incompleto o demo

- `/saas/deals` UI  
- RBAC SaaS multi-usuario  
- Secuencias email / cadencias ventas  
- Forecasting pipeline enterprise  
- Integraciones dashboard (TikTok, dialer, text2pay…) sin credenciales  
- DragDropWorkflow en UI SaaS (servicio separado de SaasWorkflowService)  
- Deprecación UI de `/dashboard/crm` y FastAPI legacy CRM  

---

## 3. Dependencias legacy activas

| Dominio | Oficial SaaS | Legacy aún vivo |
|---------|--------------|-----------------|
| Contactos | `saas_contacts` | `contacts`, `crm_contacts` |
| Pipeline UI | `pipeline_stage` en contacto | `deals`, `crm_deals`, `pipeline_deals` (sin ETL aplicado) |
| Deals datos | `saas_deals` (no en prod) | tres tablas legacy arriba |
| Cuotas | count hybrid `GREATEST(saas, legacy)` | Python lee ambos |
| Dashboards globales | adaptadores Fase 1C | widgets legacy marcados, no eliminados |
| Auth tenant | `saas_tenants.id` | `workspace_id` INTEGER bridge; algunos jobs usan `authTenantId` legacy |
| APIs | App `/api/saas/crm/*` | Pages `/pages/api/saas/*`, FastAPI `/api/crm/*`, `/dashboard/crm` |

**Riesgo principal:** dos verdades para pipeline (campo en contacto vs filas en `saas_deals`) hasta Fase 3B + ETL.

---

## 4. Qué falta para SaaS comercializable

Mínimo para vender a SMB (consultor/agencia/digital) sin vergüenza:

1. **Prod estable:** migraciones 281–282 (OS, si mismo DB), 310–311, 312–313 aplicadas y validadas  
2. **CRM único:** ETL contactos apply + UI solo `saas_contacts`  
3. **Pipeline deals:** commit 3A, UI kanban, métricas en dashboard  
4. **Billing:** límite plan + Stripe (o Paddle ya en .env) enforced en API  
5. **Onboarding → valor:** primer contacto, primer deal, primer workflow en &lt;10 min  
6. **RBAC básico:** owner + member (aunque sea 2 roles)  
7. **Retirar o ocultar** dashboard sub-módulos mock del menú comercial  
8. **Documentación operativa:** migrate, ETL, soporte  

**No necesario para v1 comercial:** 19 integraciones dashboard, drag-drop workflows, whitelabel enterprise.

---

## 5. Qué falta para CRM competitivo

Comparado con HubSpot / Salesforce / GHL (honesto):

| Capacidad | NELVYON hoy | Competidor típico |
|-----------|-------------|-------------------|
| Contactos + actividades | ✅ | ✅ |
| Deals/oportunidades | backend only | ✅ |
| Pipeline visual | por contacto, no deals | ✅ kanban |
| Email sequences | ❌ | ✅ |
| Scoring automático | módulo aparte, no en CRM core | ✅ |
| Reporting / informes | parcial, híbrido | ✅ |
| Multi-usuario permisos | ❌ | ✅ |
| Integraciones (email, calendar) | shells | ✅ |
| Mobile | ❌ | ✅ |
| IA en ventas | ❌ en SaaS UI | ✅ |

**Gap estimado:** 12–18 meses de producto dedicado para acercarse a HubSpot CRM; **8–10 semanas** para un CRM SMB creíble (contactos + deals + workflows + campañas básicas).

---

## 6. Estado por capacidad clave

### Pipeline & deals
- **SaaS:** `getPipelineSummary` sobre contactos; **3A** listo en working tree sin commit  
- **Bloqueo:** sin UI, sin migración 312 en prod, ETL deals sin contactos migrados  

### Automatizaciones
- **SaasWorkflowService:** producción-shaped  
- **Campañas:** envío simulado (estado DB, no proveedor real obligatorio)  
- **Falta:** triggers desde deals, plantillas, límites por plan  

### IA
- **OS:** fuerte (Fase 2F `/os/ia`)  
- **SaaS:** ClientBriefing, LeadScoring, Sentiment como módulos aislados; no woven en CRM  

### Onboarding
- **Listo** para primer tenant  
- **Falta:** checklist post-onboarding (crear deal, invitar miembro)  

### Billing
- Plan validation en signup  
- `billing_payments` opcional en dashboard  
- **Falta:** subscription gate, usage metering SaaS, invoice único  

### Permisos
- `authenticate()` + `getTenant(userId)`  
- **Falta:** `workspace_members` / roles aplicados a rutas `/api/saas/*`  
- RLS existe pero conexión app suele ser service role → filtro app obligatorio  

---

## 7. Qué bloquea la salida a producción

| # | Bloqueador | Severidad |
|---|------------|-----------|
| 1 | Migraciones OS **281/282** no confirmadas en prod (pipeline OS / finanzas) | Alta si misma DB |
| 2 | Migraciones SaaS **310/311** no confirmadas (bridge + RLS) | Alta |
| 3 | **312/313** y código **3A sin commit** | Crítica para deals |
| 4 | ETL contactos no aplicado → datos vacíos o dual | Alta |
| 5 | Sin RBAC tenant → no vendible a equipos | Media-alta |
| 6 | Billing sin enforcement → plan gratis efectivo | Alta comercial |
| 7 | Menú dashboard con mocks → mala percepción producto | Media |
| 8 | `DATABASE_URL` no en entorno CI/deploy local (visto en sesión ops) | Operativa |
| 9 | Dual API App vs Pages → mantenimiento y bugs | Media técnica |

---

## 8. Tareas priorizadas

### P0 — Desbloquear producción (1–3 días)
1. Aplicar y validar migraciones: 281, 282, 310, 311 (+ 312, 313 tras commit 3A)  
2. `pnpm validate:os-migrations` + script SQL deals  
3. Commit + push Fase 3A y docs OS migrations  
4. Verificar `releaseCommand` Railway en un deploy  

### P1 — Cierre CRM datos (1 semana)
5. `saas:validate-bridge` en prod  
6. ETL contactos dry-run → apply (con backup)  
7. Enforcement cuota en `POST /api/saas/crm/contacts`  
8. Ocultar/desactivar rutas legacy CRM en UI comercial  

### P2 — Pipeline producto (2 semanas)
9. UI `/saas/crm` o `/saas/deals` kanban sobre `/api/saas/deals`  
10. ETL deals dry-run → apply  
11. Dashboard: KPIs desde `/api/saas/deals/metrics`  
12. Detalle contacto: mostrar `dealsContext` (sin rediseño total)  

### P3 — Comercializable (2–3 semanas)
13. RBAC SaaS mínimo (owner/member)  
14. Billing gate por plan (middleware o service)  
15. Podar menú dashboard a módulos reales  
16. Onboarding checklist (3 acciones)  

### P4 — Competitividad CRM (4–6 semanas)
17. Email sequences básicas  
18. Informes pipeline exportables  
19. Lead scoring visible en ficha contacto  
20. Integración calendario/email (una vía)  

### P5 — Escala (posterior)
21. `saas_only` quotas; deprecar tablas legacy en lectura  
22. SSO; auditoría tenant  
23. Unificar Pages → App Router APIs  

---

## 9. Estimación de tiempo por fase

| Fase | Contenido | Tiempo realista |
|------|-----------|-----------------|
| **P0 Prod** | Migraciones + validate + commit 3A | **2–4 días** |
| **P1 Datos** | Bridge + ETL contactos + cuotas | **5–8 días** |
| **P2 Deals UI** | Kanban + métricas + ETL deals | **8–12 días** |
| **P3 Comercial** | RBAC + billing gate + poda UI | **10–15 días** |
| **P4 CRM+** | Sequences, reporting, scoring UI | **20–30 días** |
| **Total v1 comercial** | P0–P3 | **~6–8 semanas** |
| **Total CRM competitivo SMB** | P0–P4 | **~10–14 semanas** |

Estimaciones asumen **un desarrollador senior** a tiempo completo, sin rediseño marketing/web pública, y sin nuevos verticales.

---

## 10. Estado git relevante (snapshot auditoría)

**En `main` (remoto):** hasta Fase 2F OS (`c3cee30`).  
**Sin commit (working tree):** Fase 3A completa (deals), OS production migration docs/scripts, `releaseCommand` Railway.

**Acción inmediata antes de planificar 3B:** commit atómico 3A + docs prod, o descartar explícitamente.

---

## 11. Recomendación de planificación

1. **Congelar** nuevos módulos dashboard/integraciones.  
2. **Cerrar P0–P1** en una semana (prod + datos).  
3. **Fase 3B** solo pipeline deals UI (sin rediseño CRM completo).  
4. **P3** antes de cualquier campaña comercial externa.  
5. OS permanece cerrado; SaaS consume patrones OS, no código `os_*` en tenant.

---

*Informe generado para planificación interna. No sustituye due diligence legal/comercial.*
