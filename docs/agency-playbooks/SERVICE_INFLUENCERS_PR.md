# SERVICE — Influencers / PR

> Capability: `influencers_pr` · Pack: `influencers-pr-pack` · Team: `svc_social_creative`
> Flag: `NELVYON_INFLUENCERS_PR_PACK` (OFF fuera staging) · Catálogo OS v1.3.0 · Status: `PREPARED_OFF`

## ⚠️ No es una red de influencers real

Este servicio **no integra ningún directorio, red o base de datos real de influencers ni
de medios de PR**. Los candidatos del research/matching son **arquetipos sintéticos por
nicho de sector** (`source: "synthetic_sector_archetype"`, `real_profile_identified: false`)
generados para que el equipo humano tenga un punto de partida de investigación — nunca
perfiles reales identificados automáticamente. No hay scraping, no hay Pepito DB, no hay
llamada a ningún proveedor externo.

## Primary

Research/matching de creadores + scoring + brief de outreach + checklist de contrato +
plan de métricas. Todo en modo borrador para revisión humana.

## Kickoff

`POST /api/os/packs/influencers-pr-pack/kickoff` · sectores `local` | `ecommerce` | `saas_b2b`

## Entregables (portal)

- Asistente de campañas de influencers y PR
- Research matching
- Scoring sheet
- Brief outreach
- Contrato / checklist
- Metrics plan
- Informe ejecutivo

## Outreach real — SIEMPRE bloqueado

`outreach_authorized` está hardcodeado a `false` en **todos** los artefactos
(`research_matching`, `brief_outreach`, `contract_checklist`). Ningún código de este pack
envía email, DM o mensaje a un tercero real. El `brief_outreach` incluye
`send_channel: "manual_human_review_only"` y `requires_ceo_and_legal_before_send: true`.
Antes de cualquier contacto real se requiere:

1. Investigación manual humana que verifique la identidad real del candidato.
2. Revisión legal del brief (etiquetado `#publi`/`#ad`, normativa CNMC/Ley General de
   Publicidad).
3. Autorización explícita CEO + Legal, documentada fuera de este sistema.
4. Presupuesto real aprobado por CEO (este pack no calcula ni reserva presupuesto real).

## QA / evidencia

QA ≥ 85 · auditor independiente · sin `paid_spend` · sin outreach real
Smoke: `node scripts/staging-smoke-influencers-pr-e2e.mjs`

Status actual: `PREPARED_OFF` — pendiente de evidencia de staging E2E real antes de
promover a `IMPLEMENTED_VERIFIED` en `backend/agency/OsCatalogV1.ts`.

## Forbidden

Outreach real · publish_post · paid_spend · OpenAI · Pepito DB · red de influencers real
