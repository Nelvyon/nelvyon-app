# NELVYON — Revisión de escalabilidad

## Arquitectura actual

- Monorepo: `apps/web` (Next), `backend` (FastAPI), Postgres, jobs async
- Aislamiento: `workspace_id` en entidades modernas; JWT + header `X-Workspace-Id`
- SaaS bridge: `saas_tenants` ↔ `workspaces`

## Límites actuales

| Área | Límite observado | Impacto |
|------|------------------|---------|
| Listados OS | `limit=500` en UI | >500 filas sin paginación server-driven en OS |
| Billing usage | Conteos SQL por request | Latencia en workspaces muy grandes |
| Migraciones | Manuales (`pnpm migrate`) | Riesgo drift prod si olvido release |
| Jobs IA | Cola en proceso | Backlog si muchos tenants disparan agentes |
| Archivos | `object_key` sin CDN unificado OS | Enlaces inconsistentes |
| Multi-empresa | 1 workspace ≈ 1 tenant operativo | No hay org → N workspaces jerárquicos |
| Multicliente | `nelvyon_clients` por workspace | OK para agencia; no sub-tenants |
| Permisos | Matriz rol frontend + WS backend | Sin ABAC fino por registro |
| DB | Postgres single-primary típico | Cuello de botella escritura masiva |

## Riesgos

1. **Dual CRM** (`saas_contacts` + legacy) — métricas y cuotas incorrectas si ETL incompleto
2. **281 no auto en Railway** — pipeline/tareas rotas en prod nueva
3. **Sin gastos** — finanzas incompletas para Pymes
4. **Heurística biblioteca** — assets mal etiquetados = biblioteca vacía
5. **user_id filter** en algunas tablas tenant audit vs `workspace_id` — inconsistencia histórica

## Multiempresa / multicliente

| Modelo | Soporte |
|--------|---------|
| Varios workspaces por usuario | Sí (`workspace_members`) |
| Varios clientes por workspace | Sí (`nelvyon_clients`) |
| Varios proyectos por cliente | Sí |
| Holding con filiales | No nativo |
| SaaS tenant = cliente final de NELVYON | Sí (`saas_tenants`) |

## Permisos

- Roles: admin, operator, viewer, billing, etc. (`roleMatrix`)
- Operador OS no ve billing sin permiso — correcto
- Falta: permisos por módulo OS exportables para enterprise

## Crecimiento futuro (recomendaciones)

1. Paginación cursor en todos los listados OS
2. Release command Railway: `pnpm migrate:prod` obligatorio
3. Read replicas + cache listados hot (`nelvyon_clients`)
4. Event bus (invoice.paid, deal.won) para dashboard materializado
5. RLS Postgres por `workspace_id` en tablas críticas
6. Separar workers IA de API HTTP
7. Object storage con URLs firmadas estándar

## Conclusión

Escalable para **decenas–cientos de workspaces** con operación agencia típica. Para **miles de tenants** SaaS + OS concurrente hace falta materializar métricas, colas dedicadas y cerrar deuda legacy CRM/deals.
