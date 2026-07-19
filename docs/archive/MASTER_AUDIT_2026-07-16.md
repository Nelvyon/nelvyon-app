# Auditoría maestra NELVYON — 2026-07-16

> Auditoría técnica independiente durante **MCP soak 2h en curso**.  
> Restricción dura: no modificar MCP, Router certificado, Docker/Ollama/Postgres runtime, PRIVATE_MODE.

## Alcance

Revisión de arquitectura, seguridad, CI, tipado, DB, docs y deuda controlada en OS/SaaS/Private AI/Labs/infra.  
No se reescribió por estética; solo cambios con beneficio demostrable.

## Evidencia de gates (post-cambios)

| Gate | Resultado |
|------|-----------|
| `tsc --noEmit` (apps/web) | **PASS** (antes: FAIL local-ai / pg / clientId) |
| Vitest HMAC + Quotes + LMS modules + PrivateAI wiring | **63/63 PASS** |
| `validate-post-elite-migrations` 508–512 | **PASS** |
| MCP soak checkpoint (lectura) | `running`, fail=0, errors=0 (no tocado) |
| Router / specialization / PRIVATE_MODE | Sin cambios de comportamiento en rutas certificadas |

---

## 1. Mejoras implementadas

| Mejora | Evidencia |
|--------|-----------|
| HMAC fail-closed centralizado | `backend/saas/hmacSecret.ts`; Quotes/LMS/cert route |
| Tests secretos | `hmacSecret.test.ts` + Quotes “fails closed” |
| Typecheck local-ai | Tipado `RagChunk` boosts; `clientId` en retrieve; tipos pool/rows; path `pg` |
| Aislamiento RAG por cliente | Router ya pasaba `clientId`; ahora llega a `hybridSearch` |
| CI lint real | Root `lint` → eslint `apps/web/src` (`lint:legacy` = frontend) |
| Security Gates en PRs de código | paths `apps/web/**`, `backend/**` |
| Índice citas (archivo) | `512_saas_appointments_tenant_start_idx.sql` |
| Docs verdad | KI-005, Private AI README, DATABASE, CHANGELOG, PROJECT_STATUS |
| Ignorar corpus accidental | `.gitignore` → `apps/web/backend/` |

## 2. Problemas encontrados

| ID | Severidad | Problema |
|----|-----------|----------|
| A1 | P0 | Fallbacks HMAC hardcodeados en Quotes/LMS |
| A2 | P1 | `tsc` roto vía imports Private AI → local-ai (`pg`, tipos RAG, `clientId`) |
| A3 | P1 | CI minimal lintaba `frontend/` legacy, no el producto Next |
| A4 | P1 | Security Gates en PR solo si cambiaban lockfiles |
| A5 | P1 | Citas: `ORDER BY start_at` sin índice compuesto |
| A6 | P1 | Docs KI-005 / Private AI README desactualizados (“sin runtime”) |
| A7 | P1 | Dual lead-scoring (`SaasLeadScoringService` vs `LeadScoringService`) |
| A8 | P2 | Dual Ollama client (legacy vs `OllamaClient`) |
| A9 | P2 | Copia accidental `apps/web/backend/local-ai/` |
| A10 | P2 | `tenant_id TEXT` en mig 505 vs UUID en peers |
| A11 | Info | MCP aún no certificable (soak < 2h) |

## 3. Problemas corregidos

A1, A2, A3, A4, A6 (docs), A5 (migración **autorada**, no aplicada en DB del soak), A9 (gitignore; borrado físico pendiente aprobación).

## 4. Riesgos eliminados

- Firmas forjables con secretos públicos (`dev-secret` / `nelvyon-cert-secret`) si faltaba env.
- Falsa confianza de CI “lint green” sobre código legacy.
- Escaneo de secretos/Trivy omitido en la mayoría de PRs de backend/web.
- Mentira documental “Private AI sin runtime” que oculta el path router wired.

## 5. Rendimiento mejorado

- Índice compuesto citas listo para deploy (beneficio en listados `ORDER BY start_at`); **no aplicado** durante soak → sin riesgo a Postgres del benchmark.
- Typecheck verde restaura el gate elite-reinforce bloqueante.

## 6. Seguridad reforzada

- Fail-closed HMAC ≥32 chars; cert pública falla a 403 si no hay secret.
- Security Gates ampliado a cambios de producto.
- Sin cambios a PRIVATE_MODE / MCP policy / Router risk gates.

## 7. Código simplificado

- Un solo helper `requireHmacSecret` (antes 2 fallbacks distintos).
- Tipos RAG coherentes (`RagChunk`) en boosts/citations.

## 8. Duplicidades eliminadas

- Ninguna fusión runtime de stacks (Ollama/RAG/lead-scoring) — **aplazadas a post-MCP** para no invalidar soak.
- Documentada la dualidad; SSOT lint apunta a `apps/web`.

## 9. Deuda técnica eliminada

- Typecheck debt local-ai en el path Private AI.
- Docs KI-005 obsoleto.
- Gap de índice citas (archivo + validator 512).

## 10. Recomendaciones descartadas (ahora) y por qué

| Recomendación | Por qué no ahora |
|---------------|------------------|
| Certificar MCP | Soak aún `running` / sin JSON ≥7128000 ms |
| Refactor Router / MCP | Certificados / en certificación — NO TOCAR |
| Fusionar `LocalOllamaProvider` → `OllamaClient` | Puede alterar tráfico Ollama durante soak |
| Unificar lead-scoring APIs | Cambio de contrato API; planificar post-MCP con UI |
| Aplicar mig 512 en Postgres soak | Riesgo innecesario a DB compartida |
| Borrar `frontend/` legacy | Política documentada; blast radius alto, 0 ganancia prod |
| Activar Shared Memory / OpenClaw runtime | Orden ADR-017: tras MCP certificado |
| Declarar sistema “perfecto” | Quedan A7/A8/A10/A11 y ops SES/backup |

## Estado de declaración

**No se declara ningún bloque perfecto.**  
Con la evidencia actual, las mejoras soak-safe P0/P1 identificadas están aplicadas; quedan mejoras objetivas post-soak (lead-scoring SSOT, Ollama unificado, aplicar 512, certificar MCP).

## Rollback

| Cambio | Rollback |
|--------|----------|
| hmacSecret | Restaurar `?? "dev-secret"` / cert-secret (no recomendado) |
| tsconfig `pg` path | Quitar path mapping |
| package.json lint | `lint:legacy` ↔ lint |
| security-gates paths | Revertir `on.pull_request.paths` |
| mig 512 | No aplicar / `DROP INDEX IF EXISTS idx_saas_appointments_tenant_start` |
