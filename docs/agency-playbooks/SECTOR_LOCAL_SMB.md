# SECTOR PLAYBOOK — Local / SMB (restaurante, dental, fitness, belleza)

> Núcleo: `SERVICE_SEO` · `SERVICE_WEB_LANDING` · `SERVICE_SUPPORT` · pack `local-business-growth`  
> QA ≥ **85** · portal `/portal` · LLM Ollama-first (ADR-034/036)

## Inputs
- business_name, city, value_proposition, primary_cta, sector

## Kickoff
`POST /api/os/packs/local-business-growth/kickoff`

## Entregables
NELVYON-LANDING · NELVYON-SEO · NELVYON-CHATBOT → portal

## QA checklist (no inflar)
- [ ] Hero + CTA único
- [ ] SEO local coherente con ciudad
- [ ] Chatbot FAQ sin inventar datos
- [ ] Score ≥85 o status `needs_review`

## Evidencia
Pack gate + Phase C local · prod IA OFF hasta CEO

## Sector flotilla
No usar agentes sector decorativos como path primario (`mintNewSectorAgents: false`).
