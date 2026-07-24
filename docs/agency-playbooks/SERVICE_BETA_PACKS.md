# Pack playbooks — social · content · cro · analytics · brand

> ADR-050 · 2026-07-24 · QA ≥85 · portal `/portal` · flags prod OFF  
> Promote solo con E2E mesh ALL_PASS.

## social-calendar-pack

| Campo | Valor |
|-------|-------|
| Agentes | LANDING · CHATBOT · social_media_premium |
| Entregables | Landing social · Asistente social · Calendario 30 días · Informe ejecutivo |
| Playbook | Brief → SKUs → calendario 4 semanas → QA≥85 → portal |

## content-strategy-pack

| Campo | Valor |
|-------|-------|
| Agentes | LANDING · SEO · contenido_copywriting_premium |
| Entregables | Landing contenido · Keywords · Plan editorial 90d · Guía mensajes · Informe |
| Playbook | Brief → clusters → messaging → QA≥85 → portal |

## cro-audit-pack

| Campo | Valor |
|-------|-------|
| Agentes | LANDING · SEO · funnel_premium |
| Entregables | Landing CRO · Informe fricción · Auditoría · Plan A/B 30d · Informe |
| Playbook | Brief → fricción → A/B → QA≥85 → portal |

## analytics-setup-pack

| Campo | Valor |
|-------|-------|
| Agentes | SEO · LANDING · sector-analytics-ga4 |
| Entregables | Mapa eventos · Landing analytics · Setup GA4+GSC · Dashboard · Informe |
| Stack | **GA4 + Search Console existentes** · **ADR-048 REJECT/DEFER Matomo/Umami** |
| Playbook | Brief → event map → checklist GA4 → QA≥85 → portal |

## brand-voice-pack

| Campo | Valor |
|-------|-------|
| Agentes | LANDING · CHATBOT · branding_premium |
| Entregables | Landing marca · Bot voz · Guía voz · 3 value props · 3 arquetipos · Informe |
| Playbook | Brief → voice guide → personas → QA≥85 → portal |

## Rollback

Sin flags dedicadas (packs en registry estándar). Staging: `NELVYON_AI_ENABLED=0` + `OLLAMA_CONFIGURED=0`. Prod: IA/mesh OFF.
