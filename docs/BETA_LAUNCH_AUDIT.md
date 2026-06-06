# Auditoría final de lanzamiento beta — NELVYON SaaS

**Alcance:** revisión read-only del codebase y documentación interna.  
**Fecha de referencia:** post-Fase 3E (`4f03e51` — workflows y campañas conectados a `saas_deals`).  
**Última actualización:** 2026-06-05.

---

## Veredicto global

| Tipo de beta | ¿Listo? | Condición |
|--------------|---------|-----------|
| **Beta cerrada / design partner** | **Sí** | Posicionamiento honesto como CRM + pipeline; checklist P0 de producción completado |
| **Beta comercial abierta (sin matices)** | **No** | Falta validar prod (310–314), disclosure comercial, y no vender campañas/workflows como producto terminado |

**Resumen en una línea:** el núcleo CRM + pipeline + permisos es vendible para 5–15 clientes beta con onboarding asistido; no está listo como plataforma de marketing automation ni alternativa a HubSpot/GHL.

---

## Notas reales (0–10)

| Dimensión | Nota | Comentario |
|-----------|------|------------|
| **Beta comercial cerrada (global)** | **6/10** | Vendible con límites claros y ops P0 |
| **CRM + pipeline** | **8/10** | Mejor módulo; API, tests y kanban reales |
| **Marketing / automation** | **4/10** | Campañas simulan envío; triggers CRM inertos |
| **vs GHL / HubSpot (breadth)** | **3/10** | Nicho pipeline ligero, no suite all-in-one |
| **Migraciones prod (310–314)** | **?/10** | En repo; aplicación en prod no verificada en esta auditoría |

---

## Tabla por módulo

| Módulo | Estado | Riesgo | Tiempo restante | Prioridad | Nota |
|--------|--------|--------|-----------------|-----------|------|
| Onboarding | Completo (4 pasos, bridge workspace, email) | Bajo | 0–1 d (copy legal) | P1 | 8 |
| CRM / Contacts | Completo (CRUD, actividades, cuotas) | Bajo | 0 | — | 8 |
| Deals / Pipeline | Completo (kanban, métricas, sync stage) | Medio | 1–2 d (prod + ETL) | **P0** | 8 |
| Dashboard (core) | Parcial (KPIs reales; jobs/spend a menudo vacíos) | Medio | 2–3 d | P2 | 6 |
| Workflows | Parcial (`deal_stage_changed` + manual) | Alto comercial | 2–4 sem | P2 | 5 |
| Campañas | Parcial (audiencia real; envío simulado) | Alto comercial | 3–6 sem | P2 | 4 |
| Billing | Stub (uso + límites; sin checkout SaaS) | Medio | 1–2 sem | P1 | 4 |
| Settings | Solo lectura | Bajo | 1 sem | P3 | 5 |
| RBAC (App Router) | Completo (~80% UI) | Medio | 3–5 d | P1 | 7 |
| Migraciones 310–314 | En repo; prod sin verificar | **Alto ops** | 0,5–1 d | **P0** | ? |
| ETL / legacy | Scripts + Block B | Medio | 1–3 d | **P0** | 5 |
| Seguridad tenant (core) | Fuerte en App Router | Medio | 1–2 sem (legacy) | P1 | 7 |
| RLS Postgres | Parcial (8 tablas) | Medio | 1 sem | P2 | 6 |
| UI/UX nav | 7 módulos reales; 19 mocks ocultos | Medio | 1 d (demos) | P1 | 7 |
| Legacy Pages Router | ~90 rutas sin RBAC SaaS | Alto | 2–4 sem | P1 | 3 |

---

## Qué se puede vender hoy

Posicionamiento honesto y defendible:

- **CRM + pipeline de oportunidades** para equipos SMB (contactos, deals, kanban, métricas).
- **Permisos por rol** (owner, admin, member, viewer) en el producto `/saas/*`.
- **Onboarding guiado** y **cuotas por plan** (Starter / Pro / Enterprise).
- **Actividad comercial** y export de informes desde dashboard.
- **Workflows (beta):** ejecución manual y automatización al **cambiar etapa de deal**.
- **Campañas (preview):** **segmentación de audiencia** (incl. etapa de deal); no entrega real.

### Sectores aptos

- PYMEs B2B España/LATAM con pipeline en Excel/Notion.
- Equipos comerciales de 3–15 personas.
- Agencias pequeñas en piloto con onboarding asistido.
- Stakeholders con rol **viewer** (solo lectura).

---

## Qué NO se debe vender todavía

No prometer ni facturar como producto terminado:

| Claim | Motivo |
|-------|--------|
| Email marketing / SMS / multicanal con entrega real | `launchCampania` marca `sent` sin ESP/SMS |
| Marketing automation tipo HubSpot | Mayoría de triggers inertos; sin secuencias |
| Self-serve billing / upgrades in-app | Plan en onboarding = honor system |
| Módulos F62 (ads, dialer, TikTok, Text2Pay…) | Mock; ocultos del nav pero accesibles por URL |
| Enterprise (SSO, audit log, SLA) | No implementado |
| “All-in-one growth OS” / alternativa HubSpot-GHL | Breadth insuficiente (12–24 meses de gap) |

### A quién no vender (aún)

- Equipos de marketing que necesitan deliverability real.
- Call centers / power dialer.
- Empresas con SSO, auditoría formal o GDPR self-service obligatorio.
- Compradores que comparan feature-parity con HubSpot/Salesforce/GHL.

---

## Riesgos

### Comercial (impacto alto)

1. **Overselling campañas/workflows** — el mayor riesgo de churn y reputación.
2. **Demos fuera del nav core** — 19 rutas mock bajo `/saas/dashboard/*` y ~90 APIs legacy.

### Técnico / ops (impacto alto)

1. **Migraciones 310–314 no aplicadas en prod** — pipeline, deals y workflows 3E fallan en runtime.
2. **Legacy Pages Router** (`/pages/api/saas/*`) — sin RBAC SaaS; JWT `tenantId` ≠ UUID `saas_tenants.id`.
3. **ETL no ejecutado** — deals huérfanos, duplicados de contactos sin constraint DB.

### Medio

- Dual superficie producto (`/saas/*` vs `/dashboard/*`).
- RLS parcial; backend usa `service_role` (aislamiento = capa aplicación).
- Reports y deals/ETL dry-run sin RBAC granular completo.
- Miembros workspace: solo primer tenant (`LIMIT 1`).

### Matriz resumida

```
                    IMPACTO
                 Alto    Medio    Bajo
              ┌────────┬────────┬────────┐
        Alto  │ Camp.  │ Mig.   │        │
              │ vendida│ prod   │        │
PROB.    Medio │ Legacy │ Dual   │ UI     │
              │ API    │ tenant │ polish │
        Bajo  │        │ RLS    │ Tests  │
              └────────┴────────┴────────┘
```

---

## Bloqueantes P0 (antes de captar clientes)

| # | Bloqueante | Owner | Tiempo est. |
|---|------------|-------|-------------|
| 1 | Confirmar migraciones **310–314** en `_migrations` prod | Ops | 30 min |
| 2 | `pnpm saas:validate-bridge` + `pnpm validate:saas-deals-migrations` | Ops | 1 h |
| 3 | Validación manual migración **314** (CHECK `deal_stage_changed`) | Ops | 15 min |
| 4 | `pnpm saas:block-b -- --dry-run` + revisar contactos/deals/huérfanos | Ops | 1–2 h |
| 5 | Confirmar Railway **releaseCommand** + **DATABASE_URL** service_role | Ops | 45 min |
| 6 | **Beta Terms** por escrito (campañas simuladas, workflows limitados, billing manual) | Comercial | 2 h |
| 7 | **Script de demo** acotado a rutas `/saas/*` core | Ventas | 30 min |
| 8 | **Smoke test** manual end-to-end | QA | 1 h |

Detalle operativo: ver [`BETA_LAUNCH_RUNBOOK.md`](./BETA_LAUNCH_RUNBOOK.md).

---

## Posicionamiento comercial recomendado

### Mensaje principal (usar en web comercial, propuestas y demos)

> **NELVYON SaaS — CRM y pipeline comercial para equipos de venta SMB:** contactos, oportunidades, métricas y permisos por rol.

### Etiquetas obligatorias en beta

| Módulo | Etiqueta | Frase para el cliente |
|--------|----------|------------------------|
| CRM + Pipeline | **Incluido en beta** | Fuente oficial: oportunidades en `saas_deals` |
| Workflows | **Preview / beta** | Automatización real hoy: cambio de etapa de deal + ejecución manual |
| Campañas | **Preview / beta** | Segmentación y audiencia; **envío simulado** hasta integración ESP |
| Billing | **Manual** | Cuotas en producto; facturación y upgrade fuera de `/saas/billing` |

### Disclosure obligatorio (contrato o anexo beta)

1. Las campañas **no envían email/SMS real**; los contadores `sent` son simulados.
2. La mayoría de triggers de workflow **no están conectados** (solo `deal_stage_changed` y manual).
3. El plan seleccionado en onboarding **no implica cobro automático** integrado.
4. Rutas fuera del menú SaaS (`/saas/dashboard/*` extendido, `/pages/api/saas/*`) **no forman parte del producto beta**.

### Pricing beta sugerido

- Facturación **manual** (transferencia / Stripe fuera del flujo SaaS).
- Plan honor system con cuotas enforced en producto.
- 5–15 design partners antes de beta abierta.

---

## Respuestas directas

### ¿Puede venderse ya como beta?

**Sí**, como beta cerrada / design partner, **solo** con positioning CRM + pipeline y P0 completado.

### ¿Qué falta para v1 comercial?

Pagos Stripe en SaaS, ESP real en campañas, triggers CRM + scheduler, ETL prod + anti-duplicados DB, cierre legacy Pages Router, settings editables, runbook deploy en CI. Estimación: **6–10 semanas** (1–2 devs).

### ¿Qué falta para competir con GHL/HubSpot?

**12–24 meses** de producto (secuencias, deliverability, funnels, ads reales, telefonía, scoring, integraciones, mobile, etc.). Hoy el nicho es **pipeline CRM ligero multi-tenant**, no breadth all-in-one.

---

## Referencias técnicas

| Tema | Documento / código |
|------|-------------------|
| Fase 3E deals automation | `docs/PHASE_3E_SAAS_DEALS_AUTOMATION.md` |
| RBAC | `docs/PHASE_3C_SAAS_RBAC_BILLING.md`, `docs/PHASE_3D_SAAS_RBAC_UI.md` |
| Nav y mocks ocultos | `apps/web/src/features/saas-shell/saasNav.ts` |
| Migraciones 310–314 | `backend/db/migrations/310_*.sql` … `314_*.sql` |
| Runbook P0 | `docs/BETA_LAUNCH_RUNBOOK.md` |

---

## Conclusión ejecutiva

NELVYON SaaS tiene un **núcleo vendible y testeado**: onboarding, CRM, deals/pipeline, RBAC en App Router y automatización mínima por etapa de deal. Es suficiente para pilotos con onboarding asistido.

**No** está listo como plataforma de campañas, automation completa o CRM enterprise. El mayor riesgo comercial es overselling; el mayor riesgo técnico es **prod sin migraciones verificadas** y la **superficie legacy**.

**Recomendación:** lanzar captación beta solo tras completar el runbook P0 y usar el posicionamiento comercial de este documento.
