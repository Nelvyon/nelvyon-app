# NELVYON — Plataforma universal (arquitectura)

Objetivo: un núcleo que sirva a consultores, agencias, clínicas, ecommerce, inmobiliarias, hostelería, academias, pymes y enterprise **sin módulos por sector**.

## 1. Módulos válidos para cualquier sector

| Módulo | Tablas / rutas | Por qué es universal |
|--------|----------------|----------------------|
| **Personas / cuentas** | OS: `nelvyon_clients` · SaaS: `saas_contacts` | Toda empresa tiene clientes o leads |
| **Proyectos / entregas** | `nelvyon_projects`, `nelvyon_outputs` | Trabajo por encargo aplicable a cualquier servicio |
| **Pipeline comercial** | OS: `os_deals` · futuro: `saas_deals` | Ventas B2B/B2C universal |
| **Tareas** | `os_tasks` | Operación diaria transversal |
| **Documentos / activos** | `nelvyon_outputs`, `nelvyon_assets`, `contracts` | Entregables y archivos |
| **Facturación legal** | `invoices` (IVA ES) | Facturación a clientes |
| **Finanzas resumen** | billing + invoices + contracts | Control económico básico |
| **Automatización / IA** | `automation_jobs`, `/os/agents` | Eficiencia transversal |
| **Helpdesk / tickets** | `helpdesk_tickets` | Soporte universal |
| **Calendario / reservas** | `calendar_events`, bookings | Citas y servicios |
| **Workspaces / RBAC** | `workspaces`, `workspace_members`, roles | Multi-equipo |

## 2. Módulos específicos o sectoriales (no núcleo universal)

| Módulo | Motivo |
|--------|--------|
| Agentes OS por sector (`os-agents/sectors/*`) | Prompts y flujos verticales (dentistas, hoteles…) — **capa opcional**, no core |
| `creative_assets`, previews premium por vertical | Marketing de producto |
| Legacy `crm_*` / `deals` sin prefijo | Deuda técnica workspace |
| Productized Agency `(marketing)/pa/*` | Producto aparte |
| SaaS store builder sector packs | Extensión ecommerce vertical |
| Dashboards `Superior*`, hospitality/real-estate widgets | UI legacy vertical |

## 3. Qué falta por tamaño de cliente

### Autónomos

- Onboarding guiado mínimo (1 cliente, 1 pipeline, 1 factura)
- Gastos simples y margen (no existe `expenses`)
- Facturación rápida desde proyecto OS

### Pymes

- Roles granulares por módulo (parcial — `roleMatrix`)
- Informes exportables (CSV/PDF) unificados
- Integraciones contables (Holded, QuickBooks) — no core

### Grandes empresas

- Multi-entidad legal (varias razones sociales por workspace)
- SSO/SAML enterprise
- Auditoría inmutable y data residency
- API pública documentada y rate limits por tenant
- `saas_deals` + forecasting a escala

## 4. Módulos que deben ser universales (roadmap)

1. **CRM contactos** — solo `saas_contacts` (eliminar dual legacy)
2. **Deals** — `saas_deals` + `os_deals` con contrato claro OS vs tenant
3. **Tareas** — `os_tasks` + opcional `saas_tasks` espejo para cliente final
4. **Documentos** — vista unificada ya iniciada en OS (`/os/documentos`)
5. **Finanzas** — ledger mínimo ingresos/gastos sin sector
6. **Automatizaciones** — reglas declarativas, no solo jobs IA
7. **Informes** — capa sobre entidades existentes, sin vertical

## Principios de diseño

- Prefijos de dominio: `os_*` (operación NELVYON interna), `saas_*` (producto tenant), sin mezclar tablas.
- Configuración por **campos y etiquetas**, no por código sector.
- Verticales = plantillas (`nelvyon_assets` biblioteca) + agentes opcionales.

## Estado actual (post Fase 2E)

| Capa | Madurez |
|------|---------|
| OS shell Next | Alta — clientes, proyectos, pipeline, tareas, documentos, finanzas |
| SaaS producto | Media — CRM híbrido, dashboard, workflows |
| Universalidad real | Media-baja — legacy y verticales coexisten |
