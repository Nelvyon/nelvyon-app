# OS + SaaS — UX / Accesibilidad (estática)

> Snapshot 2026-07-16 · **Sin auditoría WCAG automatizada completa esta pasada** (soak lock)

## Hallazgos de diseño/sistema

| Aspecto | Observación | Estado |
|---------|-------------|--------|
| Shell SaaS | `SaasShellLayout` dark glass `#020817` / acento `#0084ff` | Consistente en páginas migradas |
| Sidebar | `SaasSidebar` `activeId` | Consistente |
| Legacy F62 hubs | Redirects, no UI mock GHL | OK |
| Marketing | `(marketing)` layout propio | Separado del SaaS |
| Portal | UI propia más simple | OK |
| OS | Superficie amplia; visual no unificada 1:1 con SaaS | Deuda UX P2 |
| `coming_soon` packs/integraciones | Etiquetado explícito | Honesto |

## Accesibilidad

| Check | Esta pasada |
|-------|-------------|
| axe / pa11y full crawl | **No ejecutado** |
| Teclado en flujos críticos | **No re-probado** |
| Contraste sistemático | Diseño dark con alto contraste relativo; **no medido** |
| Labels formularios | Muestreo no exhaustivo |

## Problemas conocidos / no fingir

- No declarar “WCAG AA cumplido” sin reporte.  
- No declarar “calidad visual mundial” por componentes modernos.  
- Diferencia OS vs SaaS visual = deuda documentada.

## Plan post-MCP

1. axe-core en Playwright smoke  
2. Checklist teclado: login → CRM → workflow  
3. Unificar tokens visuales OS↔SaaS donde aporte  

**Clasificación global UX/a11y:** PARTIAL (sistema presente; certificación a11y pendiente).
