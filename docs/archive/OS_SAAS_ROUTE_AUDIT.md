# OS + SaaS — Auditoría de rutas (estática)

> Snapshot 2026-07-16 · Conteos filesystem · Soak MCP no interrumpido

## Alcance

| Grupo | Páginas | Notas |
|-------|--------:|-------|
| Total `page.tsx` | 333 | |
| `/saas/*` | 92 | Layout `SaasShellLayout` |
| `/os/*` | 91 | Packs + platform |
| `/portal/*` | 7 | Cliente |
| `(marketing)` | 21 | Pública |
| `/admin/*` | 4 | Super-admin |

## Muestreo de rutas SaaS críticas (existencia + API asociada)

| Página | API típica | Clasificación estática |
|--------|------------|------------------------|
| `/saas/crm` | `/api/saas/crm/contacts` | IMPLEMENTED_UNCERTIFIED |
| `/saas/pipeline` | `/api/saas/deals`, pipeline | IMPLEMENTED_UNCERTIFIED |
| `/saas/campanias` | `/api/saas/campanias` | BLOCKED_EXTERNAL (SES) |
| `/saas/workflows` | `/api/saas/workflows` | IMPLEMENTED_UNCERTIFIED |
| `/saas/billing` | `/api/saas/billing` | IMPLEMENTED_UNCERTIFIED (keys) |
| `/saas/inbox` | `/api/saas/inbox` | IMPLEMENTED_UNCERTIFIED |
| `/saas/team` | `/api/saas/team` | IMPLEMENTED_UNCERTIFIED (RBAC write) |
| `/saas/lead-scoring` | lead-scoring | OK (SSOT; `/leads` 410) |
| `/saas/seo` | `/api/saas/seo` | PARTIAL |
| `/saas/publicidad` | `/api/saas/ads` | PARTIAL |
| `/saas/social` | `/api/saas/social` | PARTIAL |
| `/saas/integraciones` | hub + catalog `coming_soon` | PARTIAL (explícito) |
| `/saas/dashboard/*` F62 | redirects | OBSOLETE |

## Rutas OS críticas

| Página | API | Estado |
|--------|-----|--------|
| `/os/packs/**` | kickoff `/api/os/packs/[packId]/kickoff` | IMPLEMENTED_UNCERTIFIED |
| `/os/certificates` | certifications APIs | IMPLEMENTED_UNCERTIFIED |
| `/os/(platform)/dashboard` | platform APIs | IMPLEMENTED_UNCERTIFIED |

## Hallazgos estáticos (no E2E browser)

| Hallazgo | Severidad | Acción |
|----------|-----------|--------|
| 333 páginas no re-ejecutadas en browser esta pasada | Info | Programar E2E post-MCP |
| Integraciones UI marca `coming_soon` honestamente | OK | No mock silencioso |
| Dashboard F62 = redirect | OK | No reconstruir |
| Attribution/deliverability `schemaPending` empty | Baja | Empty honesto si mig pendiente |

## Estado de esta auditoría

| Criterio | Cumple |
|----------|--------|
| Inventario de rutas por conteo | Sí |
| Prueba visual/browser de todas | **No** (soak lock) |
| Botones/handlers de todas las páginas | **No** — pendiente post-MCP |

**No se declara auditoría de rutas “completa en runtime”.**
