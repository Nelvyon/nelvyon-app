# OS + SaaS — Auditoría de API (estática)

> Snapshot 2026-07-16 · 513 `route.ts` bajo `apps/web/src/app/api`

## Conteos

| Prefijo | Rutas |
|---------|------:|
| `/api/saas` | 228 |
| `/api/os` | 71 |
| `/api/platform` | 76 |
| `/api/public` | 21 |
| `/api/cron` | 16 |
| `/api/webhooks` | 8 |
| `/api/auth` | 11 |
| `/api/admin` | 5 |
| **Total api** | **513** |

## Controles transversales (evidencia código)

| Control | Estado | Evidencia |
|---------|--------|-----------|
| Auth SaaS | `requireSaasContext` | `saasRequestContext.ts` |
| RBAC mutaciones privilegiadas | `settings.write` (owner) | ADR-022; api-keys/team/webhooks/store |
| Errores genéricos 500 | `saasErrorBody` → Internal error | ADR-020 |
| Rate limit forms/contact | middleware matcher | ADR-020 |
| BFF POST fail-closed | 502 degraded | `adsBffRoute.ts` |
| Webhooks SSRF | `assertSafeEgressUrl` | ADR-022 |
| HMAC ≥32 | `requireHmacSecret` | ADR-018 |
| Public API rate limit | `requirePublicApiContext` | in-memory (multi-instance P2) |
| Cron auth | fail-closed | `cronAuth` |
| Legacy pages/api saas | 410 | `_deprecated.ts` |

## Endpoints de riesgo revisados (muestra)

| Endpoint | Auth | Notas |
|----------|------|-------|
| `POST /api/saas/api-keys` | settings.write | Antes settings.read — corregido |
| `POST /api/saas/webhooks` | settings.write + SSRF | Corregido |
| `POST /api/saas/team` | settings.write | Corregido |
| `POST /api/platform/ecommerce/.../products` | platform claims | Sin mock-product success |
| `GET /api/public/contracts/sign/[token]` | token + sanitize HTML | XSS |
| `GET /api/saas/mcp` | SaaS + flag | **No tocar** (soak) |
| `POST /api/saas/private-ai/inference` | SaaS | Router wired |

## Huecos conocidos (no cerrados esta pasada)

| Hueco | Prioridad |
|-------|-----------|
| OpenAPI contract sync completo vs 513 rutas | P2 |
| Rate limit Redis en public API multi-réplica | P2 |
| TenantId inseguro en body — muestreo no exhaustivo de 513 | P1 post-MCP |
| E2E contract tests por dominio | P1 post-MCP |

## Conclusión

APIs **existen y están cableadas** en gran medida; **no** se certifica el 100% de 513 rutas con E2E en esta pasada. Hardening reciente (ADR-022) cubre P0 identificados. MCP/Router no modificados.
