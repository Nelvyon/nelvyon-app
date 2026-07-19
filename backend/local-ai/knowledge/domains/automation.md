# Automatizaciones NELVYON — Knowledge Pack

## Workflows SaaS
- Triggers: evento CRM, cambio etapa pipeline, webhook externo, cron programado
- Idempotencia: ventana 4 minutos para evitar duplicados en workflows scheduled
- Endpoint cron protegido: `CRON_SECRET` en `/api/cron/saas-workflows`

## Secuencias email
- Onboarding día 0, 1, 3, 7 con segmentación por plan
- Bounce handling integrado en campañas SES

## Aprobaciones
- Acciones sensibles requieren aprobación humana (constitución IA)
- Packs OS auto-aprueban si QA ≥ 85

## JSON herramientas
Schema campaña: `{"tool":"create_campaign","args":{"name":"string","budget_eur":number,"channels":["email","linkedin"]}}`
