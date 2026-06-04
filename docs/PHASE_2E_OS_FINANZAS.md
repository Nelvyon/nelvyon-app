# Fase 2E — Finanzas y operación empresarial OS

## TAREA 1 — Auditoría financiera

| Área | Qué existe | Producción / mock | Uso en OS 2E |
|------|------------|-------------------|--------------|
| **Billing** `/api/v1/billing/*` | `summary`, `usage`, `invoices` | **Real DB** (`subscriptions`, contadores workspace) | Pagos **suscripción plataforma** — no ingresos a clientes |
| **Billing invoices** | Filas derivadas de `subscriptions` | Real historial suscripción; PDF URL sintética | Etiquetado como plataforma, no factura legal |
| **Facturas españolas** `/api/invoices` | Tabla `invoices` + IVA + PDF ReportLab | **Producción** | **Ingresos operación** (paid/sent/draft) |
| **Contratos** `/api/v1/entities/contracts` | Tabla `contracts` workspace | Producción | Listado + activos |
| **os_deals** | `os_deals.estimated_value` status `ganado` | Producción (tras migración 281) | Pipeline ingresos estimados |
| **Ingresos / gastos contables** | No hay `expenses` / `ledger` OS | — | Gastos: **Sin datos todavía** (honesto) |
| **Reportes** `report_items` | Entidad genérica | Producción pero no integrado finanzas OS | Pendiente |
| **text2pay_payments** | Pagos Stripe cliente | Real; flag `mock` en dev sin Stripe | Fuera OS shell 2E |
| **SaaS CRM / saas_deals** | Planificado Fase 1C | No implementado | **No tocado** (restricción 2E) |

### Qué NO es mock en finanzas OS

- KPIs solo si hay filas en `invoices`, `contracts`, `os_deals` o respuestas billing con datos.
- `usage` meters incluyen heurística display (`api_calls`, `storage_gb`) documentada en backend — no se muestran como ingresos.

### Qué puede confundir

| Fuente | Confusión | Mitigación UI |
|--------|-----------|---------------|
| `/api/v1/billing/invoices` vs `/api/invoices` | Misma palabra, tablas distintas | Secciones separadas en `/os/finanzas` |
| `total_paid_ytd` billing | Suma suscripciones activas YTD | Label "Suscripción YTD" en dashboard |

---

## TAREA 2–3 — Implementación UI

### `/os/finanzas`

- Resumen: ingresos mes/año (facturas `paid`), pendientes, contratos activos, pipeline ganado, clientes/proyectos
- Cobros: stats `GET /api/invoices/stats`
- Pagos plataforma: billing (si rol `billing.view`)
- Tablas facturas + contratos
- Empty: **Sin datos todavía**

### `/os/dashboard` (financiero)

- Ingresos del mes, facturas pendientes, contratos activos (desde invoices/contracts)
- Suscripción YTD separada (billing)

### Código

- `apps/web/src/features/os-shell/finanzas/`
- Tests: `finanzas/__tests__/compute.test.ts`

---

## Endpoints usados

| Endpoint | Métrica |
|----------|---------|
| `GET /api/invoices/stats` | total_facturado, pendiente, pagado |
| `GET /api/invoices?limit=300` | Ingresos periodo, listado |
| `GET /api/v1/entities/contracts` | Contratos activos |
| `GET /api/v1/entities/os_deals?query={"status":"ganado"}` | Pipeline ganado |
| `GET /api/v1/billing/summary` | Plan, YTD suscripción (opcional) |
| `GET /api/v1/entities/nelvyon_clients` / `projects` | Activos operativos |

---

## Pendiente

- Módulo gastos (`expenses`) y flujo de pagos a proveedores
- P&L / cashflow unificado
- Enlace presigned para `object_key` en facturas PDF ya en `/api/invoices/{id}/pdf`
- Consolidar ingresos deals + facturas (hoy se muestran separados)

## Riesgos

- Sin migración nueva en 2E
- Ingresos mes/año = 0 filas paid en periodo → null → "Sin datos todavía" (correcto)
- Rol sin billing no ve bloque suscripción

## Próximo paso recomendado

**Fase 2F — Ledger OS mínimo (`os_expenses` + `os_revenue_events`)** o **Fase 3 SaaS universal CRM** según prioridad producto; antes ejecutar migración **281** en producción si aún no está aplicada.
