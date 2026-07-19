# OS + SaaS — Auditoría de seguridad (funcional)

> Snapshot 2026-07-16 · Combina ADR-018/020/022 + KI + soak lock

## Objetivos (estado)

| Objetivo | Estado | Evidencia |
|----------|--------|-----------|
| Fugas secretos = 0 (CI) | Gates Gitleaks ON | `security-gates.yml` |
| Cross-tenant = 0 (prueba exhaustiva) | **No re-probado E2E hoy** | App filters + RLS parcial |
| Escrituras no autorizadas = 0 (privilegiadas) | **Mejorado** | `settings.write` owner |
| Críticos sin aprobación | MCP/IA policy | MCP soak; no tocar |
| Vulnerabilidades critical npm = 0 | CI audit critical | KI-012 highs quedan |

## Controles corregidos recientemente (evidencia)

| Control | ADR | Tests |
|---------|-----|-------|
| HMAC fail-closed ≥32 | 018 | `hmacSecret.test.ts` |
| XSS LMS/citas + contratos/funnels | 020/022 | `htmlEscape` / sanitize |
| RBAC api-keys/team/webhooks/store | 022 | privileged write gate |
| SSRF webhooks | 022 | `safeEgressUrl.test.ts` |
| BFF POST sin mock | 022 | `adsBffRoute` |
| OAuth open redirect allowlist | 022 | oauth allowlist tests |
| saasErrorBody sin leak SQL | 020 | saasRequestContext tests |
| Forms rate-limit matcher | 020 | middleware |

## Pendiente (no fingir cerrado)

| Ítem | Sev |
|------|-----|
| IDOR sweep sistemático 228 APIs SaaS | P1 |
| Public API rate limit multi-réplica Redis | P2 |
| Site builder `/w/*` HTML raw (CSP/sandbox) | P1 |
| DbClient `rejectUnauthorized: false` | P2 ops |
| SES / secrets prod | P0 ops |

## MCP / Router

| Área | Acción esta pasada |
|------|--------------------|
| MCP | **No modificado** (soak) |
| Router | **No modificado** (certificado) |

## Conclusión

Seguridad **reforzada** en P0/P1 conocidos; **no** equivale a pentest completo ni a “0 riesgo”.  
Clasificación: **IMPLEMENTED_UNCERTIFIED** a nivel producto; controles puntuales **CERTIFICADOS por tests unitarios**.
