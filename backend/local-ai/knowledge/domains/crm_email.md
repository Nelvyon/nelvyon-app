# CRM, Ventas y Email — Referencia NELVYON

## Pipeline CRM
Etapas típicas: Lead → Calificado → Propuesta → Negociación → Cerrado/Perdido.
Lead scoring: fit (ICP) + engagement (email, web, ads). Routing por territorio/industria.

## Ventas B2B consultivas
Discovery: situación, problema, implicación, necesidad-payoff (SPIN).
Objeciones: precio, timing, competencia, autoridad — responder con valor, no presión.

## Email marketing (NELVYON stack)
AWS SES: SPF, DKIM, DMARC, suppression BOUNCE+COMPLAINT.
Segmentación por comportamiento, consentimiento GDPR, unsubscribe obligatorio.
Secuencias: onboarding, nurturing, reactivación, win-back.

## Deliverability
Rebotes hard/soft, complaints, warm-up IP/dominio, list hygiene.
No comprar listas. Double opt-in recomendado B2B.

## Automatizaciones CRM
Triggers: form submit, stage change, inactivity N days.
Acciones: task, email, webhook, workflow. Idempotencia 4 min en workflows NELVYON.

## Forecasting
Pipeline × win rate × avg deal size. Revisión semanal. Sin inflar probabilidades.
