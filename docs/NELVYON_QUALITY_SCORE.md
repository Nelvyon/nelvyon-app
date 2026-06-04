# NELVYON — Puntuación de calidad real (0–10)

Comparativa orientativa vs HubSpot, Salesforce, Monday, ClickUp, GoHighLevel.  
Escala: **5 = usable MVP**, **7 = producto serio SMB**, **9 = líder categoría**.

| Área | Nota | Comentario breve |
|------|------|------------------|
| **OS (interno NELVYON)** | **6.5** | Shell Next sólido (clientes, proyectos, pipeline, tareas, documentos, finanzas). Falta ledger gastos y polish enterprise. vs Monday ~8 operaciones, ClickUp ~8 tareas — OS va bien en flujo agencia, menos maduro en colaboración masiva. |
| **SaaS (producto tenant)** | **5.5** | Dashboard, CRM híbrido, workflows, billing. Dual legacy resta claridad. vs GHL ~7 todo-en-uno SMB — NELVYON más amplio pero menos cohesionado. |
| **CRM** | **4.5** | `saas_contacts` oficial pero legacy vivo; sin `saas_deals` aún. vs HubSpot CRM ~9 / SF ~10 — gap grande en automatización ventas y reporting. |
| **Pipeline** | **5.0** | OS `os_deals` funcional; SaaS deals planificado no shipped. vs HubSpot deals ~8 — falta email sequences, scoring, forecasting. |
| **Dashboard** | **5.5** | OS dashboard real multi-fuente; SaaS métricas hybrid documentadas. vs Monday ~8 widgets — menos personalizable, algunos KPIs frágiles sin datos. |
| **Automatizaciones** | **6.0** | Jobs, webhooks, agentes IA potentes pero complejos. vs GHL automations ~8 — curva alta, menos plantillas listas. |
| **IA** | **7.0** | Muchos agentes OS — diferenciador real. vs competidores IA genérica ~6 — ventaja NELVYON si se simplifica UX ejecución. |
| **Escalabilidad** | **5.0** | Workspace model OK; límites listados, migrate manual, legacy DB. vs SF ~10 — enterprise gap. |
| **Seguridad** | **6.0** | JWT, workspace scope, audit parcial, RLS en progreso (migraciones 279+). vs enterprise CRM ~9 — falta SSO, políticas formales SOC2 en producto. |
| **UX** | **6.0** | OS oscuro premium coherente; producto general más heterogéneo (dashboard vs OS vs SaaS). vs Monday ~8 — NELVYON mejora en OS, disperso fuera. |

## Media ponderada (producto completo): **~5.8 / 10**

Producto **real y usable** para operación agencia/digital en OS + SaaS temprano. **No** comparable a suite CRM madura en ventas enterprise ni en adoption SMB out-of-the-box.

## Fortalezas honestas

- Separación OS / SaaS en marcha
- IA y automatización profundas en backend
- Facturación española real (invoices)
- Iteración rápida fases 2A–2E en shell OS

## Debilidades honestas

- Legacy CRM/deals
- Finanzas sin gastos
- Migraciones no automatizadas en deploy
- Demasiados verticales código vs plantillas universales

## Próximo paso recomendado (producto)

1. Ejecutar migración **281** en producción  
2. **Fase 2F**: `os_expenses` + dashboard cashflow simple  
3. **Fase 3**: `saas_deals` + cierre ETL contactos  
4. Unificar auth/tenant bridge y deprecar listados legacy en UI
