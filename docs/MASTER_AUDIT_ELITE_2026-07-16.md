# Auditoría final elite — NELVYON (2026-07-16)

> Criterio: ADR-019 / `QUALITY_STANDARD.md`.  
> Restricción: MCP soak en curso — **no** tocar MCP, Router, Docker/Ollama, apply migrate en DB soak.  
> Rol: CTO — reducir riesgo y deuda de alto impacto, no añadir features.

## Evidencia de gates (esta pasada)

| Gate | Resultado |
|------|-----------|
| Anti-stub + `ctx.claims.userId` | **PASS** |
| Migraciones 508–512 | **PASS** |
| Vitest (HMAC, htmlEscape, saasRequestContext, Quotes, middleware) | **42/42 PASS** |
| `tsc --noEmit` | **PASS** |
| MCP soak checkpoint | `running`, fail=0, errors=0 (~44 min) — **intact** |

---

## 1. Mejoras implementadas

| # | Mejora | Motivo | Evidencia |
|---|--------|--------|-----------|
| E1 | `ctx.claims.userId` en partner/PWA/voice/brief-to-launch | Campo `ctx.user` no existe → partner 400 permanente | Anti-stub gate + rutas corregidas |
| E2 | `escapeHtml` en LMS cert + email citas | XSS / HTML injection en artefactos firmados y SES | `htmlEscape.test.ts` |
| E3 | `requireHmacSecret` unificado (tracking, portal, OAuth) | Misma barra ≥32 en todas las firmas HMAC | `hmacSecret.test.ts` |
| E4 | Middleware matcher incluye `/api/forms`, contact, waitlist, site-chat | Rate-limit de forms **nunca se ejecutaba** (matcher excluía `api/*`) | `middleware.ts` + test form-submit |
| E5 | `saasErrorBody` no filtra `Error.message` genéricos | Evita leak SQL/driver a clientes | `saasRequestContext.test.ts` |
| E6 | Stripe-store: skew ±5m + compare timing-safe | Replay + timing attacks | `webhooks/stripe-store/route.ts` |
| E7 | Web Quality Gates valida 508–512 | CI producto no omitía migraciones post-elite | `web-quality-gates.yml` |
| E8 | Deprecación documentada lead-scoring dual | SSOT claro sin romper contrato aún | `lead-scoring/leads/route.ts` |
| E9 | Gate anti-regresión `ctx as { user` | Evita reintroducir bug E1 | `check-saas-stubs.mjs` |

*(Incluye también el lote soak-safe previo: HMAC Quotes/LMS, typecheck local-ai, CI lint→apps/web, security-gates paths, mig 512 autorada, ADR-019.)*

## 2. Mejoras descartadas y por qué

| Mejora | Por qué no ahora |
|--------|------------------|
| Certificar MCP | Soak < 2h; sin JSON ≥7128000 ms |
| Fusionar Ollama / RAG dual | Alteraría tráfico durante soak |
| Unificar APIs lead-scoring (merge) | Cambio de contrato + migración datos; documentado, post-MCP |
| Aplicar mig 512 / UUID tenant_id 505 | Apply en Postgres soak prohibido |
| Borrar `frontend/` legacy | Blast alto, 0 ganancia prod |
| Activar Shared Memory / OpenClaw | Orden ADR-017 |
| Reescribir Stripe principal | Ya maduro; solo se endureció stripe-store |
| `rejectUnauthorized: false` Supabase SSL | Tradeoff conocido; requiere CA bundle ops |

## 3. Riesgos eliminados

- Partner/PWA/voice sin userId real
- XSS en certificado LMS público
- HTML injection en emails de cita
- Spam/DoS forms sin rate-limit efectivo
- Firmas HMAC con secretos cortos en tracking/portal/OAuth
- Replay webhook store sin ventana de tiempo
- Filtrado de errores internos en JSON 500
- CI web sin assert de migraciones 508–512

## 4. Deuda técnica restante (documentada)

| Ítem | Severidad | Plan |
|------|-----------|------|
| Dual lead-scoring | P1 | Merge post-MCP → `SaasLeadScoringService` |
| Dual Ollama + dual RAG | P1 | Post-cert MCP |
| `tenant_id TEXT` mig 505 | P1 | Mig UUID+FK post-soak |
| Mig 512 no aplicada en DB | P2 | Release migrate post-soak |
| SES sandbox / dominio (KI-013/014) | P0 ops | CEO |
| npm high transitive (KI-012) | P2 | Upstream |
| `apps/web/backend/` en disco | P2 | gitignored; borrar local con OK |
| Legacy MCP stdio vs productive | P2 | Convergencia post-cert |

## 5. Duplicidades restantes

- Lead scoring ×2 (API + tablas)
- Ollama HTTP ×2 (`LocalOllamaProvider` vs `OllamaClient`)
- RAG ×2 (`NelvyonRagStore` vs local-ai vector)
- MCP legacy + MCP productivo (coexistencia intencional hasta cert)

## 6. Rendimiento mejorado

- Índice citas 512 **listo** (beneficio al aplicar en deploy)
- Rate-limit forms activo → menos fan-out CRM/workflows bajo abuso

## 7. Seguridad reforzada

E1–E6 + política HMAC única + gates CI.

## 8. Calidad de arquitectura

- Auth context coherente con `SaasRequestContext`
- Escape HTML compartido (`htmlEscape.ts`)
- Secrets HMAC SSOT
- Docs de deprecación donde la unificación debe esperar evidencia soak
- **No** se declaró ningún bloque perfecto

## 9. Estado de producción

| Área | Estado |
|------|--------|
| SaaS CRM / campañas / workflows / billing | Operativo (código) |
| OS packs | Operativo |
| Router | Certificado — no tocar |
| MCP productivo | Soak en curso — no certificar aún |
| Private AI → Router | Wired (ADR-015) |
| Ops email SES | Bloqueado CEO (sandbox/dominio) |
| Backup primer run | Pendiente CEO |

## 10. Backlog priorizado (alto impacto restante)

1. **P0 ops** — SES dominio + salir sandbox  
2. **P0 cert** — Completar soak MCP 2h → certificación  
3. **P1** — Apply mig 512 en release  
4. **P1** — SSOT lead-scoring (deprecar `LeadScoringService`)  
5. **P1** — Unificar Ollama client + documentar RAG SSOT  
6. **P1** — Mig UUID `tenant_id` tablas 505  
7. **P2** — Shared Memory runtime (post-MCP)  
8. **P2** — Limpieza MCP legacy tras cert  

## Declaración CTO

**NELVYON no está terminado.**  
Las mejoras de alto impacto **soak-safe** identificadas en esta pasada están implementadas con evidencia.  
Las restantes están **documentadas con justificación técnica** (riesgo soak / contrato / ops CEO).  
Ningún bloque se declara perfecto.
