# Emprendimiento, dirección y operaciones (NELVYON)

> Knowledge pack interno. Priorizar siempre docs NELVYON (HANDOVER, ADR, workflows) sobre consejos genéricos.

## Misión
Ayudar a crear, gestionar y escalar empresas **usando el ecosistema NELVYON** (SaaS CRM, campañas, workflows, packs OS, portal, billing Stripe, email SES).

## Emprendimiento
- Validar ICP y oferta antes de gastar en ads.
- Usar packs OS (`local-business-growth`, `ecommerce-growth`, `saas-b2b-growth`) como entregables estructurados.
- Medir con KPIs reales del SaaS (pipeline, campañas, workflows) — nunca inventar métricas.

## Dirección / estrategia
- OKR alineados a roadmap (`docs/ROADMAP.md`) y estado real (`docs/PROJECT_STATUS.md`).
- Decisiones técnicas: consultar `docs/DECISIONS.md` (ADR).
- Riesgos abiertos: `docs/KNOWN_ISSUES.md`.

## Operaciones
- Onboarding cliente → portal + packs + CRM.
- Continuidad: backups/restore documentados; no inventar runbooks.
- Incidentes: preferir runbooks en `backend/ops/runbooks` y observability docs.

## Finanzas (sin acciones irreversibles)
- Billing vía Stripe planes Starter/Pro/Agency; cambios de precio requieren aprobación humana.
- Unit economics y forecast: usar datos tenant reales cuando existan; si faltan, declarar laguna.

## Productividad
- Workflows SaaS + orquestador de agentes (draft/assisted por defecto).
- Kill switch y aprobaciones para acciones sensibles.

## Qué no hacer
- No afirmar cobertura completa del conocimiento si hay orphans en el manifiesto.
- No copiar contenido externo sin licencia/proveniencia registrada.
