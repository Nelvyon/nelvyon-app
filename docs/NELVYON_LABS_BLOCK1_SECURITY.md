# NELVYON-LABS — Bloque 1 Seguridad (cerrado)

> 2026-07-15 · Post **ROUTER DE MODELOS NELVYON COMPLETADO**

## Decisiones finales (2/2 del bloque)

| ID | Decisión | Evidencia |
|---|---|---|
| **gitleaks** | **Integrado** | Ya en CI `secret-scan`; adaptador NELVYON + flag `NELVYON_GITLEAKS_ENABLED`; tests contract |
| **trivy** | **Integrado** | Nuevo job CI `trivy-fs` (Action oficial, no vendor); adaptador + flag `NELVYON_TRIVY_ENABLED`; scan CRITICAL/HIGH `apps/web` |

## Comparación con stack previo

| Capacidad | Antes | Después |
|---|---|---|
| Secret scan | Gitleaks Action ✅ | Igual + contrato/adaptador/flag documentado |
| Vuln fs/deps | pnpm audit critical only | + **Trivy fs** CRITICAL/HIGH (complementario, no duplicado) |

## Artefactos

- `backend/security/NelvyonSecurityScanAdapter.ts`
- `scripts/nelvyon-security-scan.mjs` (CLI opcional local)
- `backend/saas/__tests__/nelvyonSecurityScanAdapter.test.ts` (3 pass)
- `.github/workflows/security-gates.yml` (job `trivy-fs`)
- ADR-013 en `docs/DECISIONS.md`

## Seguridad / licencia

- Gitleaks: MIT · Trivy: Apache-2.0
- Sin telemetría añadida · Sin puertos nuevos · Sin copia de monorepos Labs
- Rollback: variables de repo `NELVYON_*=0`

## Impacto recursos

| Recurso | Impacto |
|---|---|
| RAM/VRAM runtime SaaS | **0** (solo CI) |
| Disco producto | ~negligible (YAML + TS adapter) |
| CI tiempo | +~2–10 min job Trivy en push/PR paths / schedule |

## Bloque 1 gate

**CERRADO** — se puede avanzar a bloque 2 Observabilidad.  
**MCP / OpenClaw / orquestador:** aún NO (falta cola Labs + wiring según HANDOVER).
