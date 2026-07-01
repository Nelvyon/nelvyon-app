# NELVYON — Puntuación de calidad real (0–10)

Comparativa orientativa vs HubSpot, Salesforce, GoHighLevel.  
Escala: **5 = usable MVP**, **7 = producto serio SMB**, **9 = líder categoría**.

> Actualizado jul-2026 — post elite frentes 482–484, deals/pipeline, 25+ workflow recipes, packs IA.

| Área | Nota | Comentario breve |
|------|------|------------------|
| **OS (interno NELVYON)** | **7.5** | 29 servicios + 3 packs autónomos E2E, competitor gap, brief-to-launch. vs Monday ~8 — paridad operativa agencia. |
| **SaaS (producto tenant)** | **7.0** | 59 módulos UI+API, shell coherente dark glass. vs GHL ~7 — paridad breadth; ops live (SES/Twilio) pendiente usuario. |
| **CRM** | **6.5** | `saas_contacts` oficial, territories, copilot. vs HubSpot ~9 — legacy congelado, no borrado. |
| **Pipeline** | **7.0** | `saas_deals` kanban, forecast, quotes, playbooks. vs HubSpot deals ~8 — falta forecasting ML. |
| **Dashboard** | **6.5** | KPIs reales multi-fuente. vs Monday ~8 — menos widgets drag-drop. |
| **Automatizaciones** | **7.5** | 16 triggers, 17 acciones, editor visual, **24+ plantillas GHL-style** importables. vs GHL ~8 — paridad plantillas; curva UX media. |
| **IA** | **8.0** | Packs autónomos, autopilot, agentes OS — diferenciador real. vs competidores IA genérica ~6. |
| **Escalabilidad** | **6.0** | RLS, sandbox tenants, IP allowlist. vs SF ~10 — enterprise gap. |
| **Seguridad** | **7.0** | JWT, SSO UI, MFA schema, custom RBAC. vs enterprise ~9 — SOC2 formal pendiente. |
| **UX** | **6.5** | SaaS shell unificado, i18n nav. vs Monday ~8 — heterogeneidad menor residual. |

## Media ponderada (producto completo): **~7.1 / 10**

Producto **listo para vender SMB/agencia** con paridad funcional core vs GHL+HubSpot en código.  
**No** = líder mundial #1 en adopción/mercado (eso es clientes + tiempo, no commits).

## Fortalezas honestas

- 98 frentes producto con UI + API
- IA packs + agencia autónoma (único vs GHL)
- Workflow recipe library importable (paridad GHL snapshots)
- Pipeline deals + quotes + playbooks shipped
- PWA push, dialer parallel, API v2 webhooks DLQ

## Debilidades honestas (no código bloqueante)

- Ops live: SES, Twilio, Stripe, OAuth (manual Railway)
- Legacy CRM tablas congeladas (sin delete)
- Mobile native apps (GHL tiene)
- Marketplace terceros (HubSpot tiene miles)

## Veredicto venta

| Pregunta | Respuesta |
|----------|-----------|
| ¿Mejor producto para lanzar agencia+SaaS? | **Sí** — código elite listo |
| ¿Supera GHL/HubSpot en todo hoy? | **No** — paridad core sí; ecosistema/mercado no |
| ¿Qué falta? | Secrets + clientes + tiempo en mercado |
