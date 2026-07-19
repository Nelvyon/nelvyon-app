# Ciberseguridad, cloud y DevOps (NELVYON)

> Knowledge pack interno alineado al stack real: Next.js 15, Postgres 16, Railway, Ollama/PRIVATE_MODE, MCP, Shared Memory.

## Seguridad
- Headers/CSP SSOT: `apps/web/src/lib/security/headers.ts`
- Auth SaaS JWT httpOnly; platform claims para OS/portal.
- Tenant isolation: RLS + Shared Memory scopes + SecurityGuard (prompt injection / exfil).
- Secretos: nunca en docs; CI Gitleaks + audit critical.

## Cloud / deploy
- Railway: web `:3000`, Python `:8000`, `releaseCommand` migrate.
- Checklist: `docs/RAILWAY_DEPLOY_CHECKLIST.md`, `docs/ENVIRONMENTS.md`, `docs/INFRASTRUCTURE.md`.
- Cloudflare: DNS/WAF ops manual (no inventar estado).

## Observabilidad
- Health: `/api/health`, `/live`, `/ready`, `/deep`.
- Métricas Private AI + panel `/saas/ai`.
- Runbooks observability en `backend/ops/runbooks`.

## DevOps agentes
- Agente `devops` / `cto`: runbooks y diagnóstico; **sin deploy prod** sin aprobación.
- Migraciones: orden numérico hasta 514+; splitter en migrate.ts / migrate-pg.

## Prioridad de respuesta
1. Docs NELVYON indexadas (RAG).
2. Código/contratos del repo.
3. Conocimiento general solo si no hay fuente interna — declarar incertidumbre.
