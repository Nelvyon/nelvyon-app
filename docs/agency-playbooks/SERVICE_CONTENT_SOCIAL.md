# SERVICE — Redes sociales completas por cliente

> Capability: `content_social` · Pack: `social-calendar-pack` · Team: `svc_social_creative`  
> ADR-052 · QA ≥ 85 · crítico ≥ 90 · **paid social PREPARED_OFF** · publish default **NOT_AUTHORIZED**

## Equipo profesional (10 roles)

| Rol | Responsabilidad | Forbidden |
|-----|-----------------|-----------|
| Estratega social | Objetivos, canales, público, posicionamiento, plan mensual | publish, OAuth, spend, mass DM |
| Investigador tendencias/competencia | Oportunidades reales por sector | publish, spend |
| Content planner | Calendario editorial por red y objetivo | publish, spend |
| Copywriter social | Hooks, guiones, copies, CTA, hashtags, variantes | publish, false_promise |
| Director creativo / diseñador | Línea visual, carruseles, coherencia marca | paid render sin OK, publish |
| Equipo de vídeo | Guion, storyboard, escenas, subtítulos, formatos | paid render sin OK, publish |
| Community manager | Respuestas preparadas, clasificación, escalados | sensitive auto-reply, mass DM |
| Paid social | Kit OFF hasta OAuth + cuenta + presupuesto CEO | oauth, spend, publish ads |
| Analista social | Reach, retención, leads, ventas, sentimiento, experimentos | spend |
| QA social élite | Rechaza mediocre, errores, promesas falsas, off-brand, desadaptación plataforma | self-approve, publish |

## Plataformas (formatos + dimensiones)

TikTok · Instagram Reels/Stories/Posts · Facebook · YouTube Shorts/long · LinkedIn · X · Pinterest · Google Business Profile  

SSOT código: `backend/agency/OsSocialNetworksService.ts` → `SOCIAL_PLATFORM_SPECS`.

## Flujo obligatorio

```
brief_and_brand
→ monthly_strategy
→ editorial_calendar
→ asset_creation
→ qa_creative_technical_brand
→ client_approval_if_required
→ authorized_schedule_or_publish
→ analytics
→ continuous_improvement
```

## Entregables pack (portal-visible)

1. Landing social / Asistente social (SKUs)
2. **Calendario 30 días** (portal)
3. **Estrategia social mensual**
4. **Kit multi-red + formatos** (copies, creatividades, vídeo, asset library)
5. **Playbook community + paid OFF** (CM, trends, analytics, QA rubric, rollback)
6. Informe ejecutivo

## Hard gates

- Nunca publicar / responder sensible / OAuth / gastar ads / mass DM sin permisos, consentimiento, trazabilidad y autorización cliente/CEO.
- `assertSocialPublishAuthorized` → fail-closed (`PUBLISH_DISABLED_DEFAULT`).
- `NELVYON_PAID_SOCIAL_ENABLED` default OFF.
- Visual spend OFF (`VisualGenerationProvider` strategy_only).

## Rollback

1. No publicar
2. `NELVYON_VISUAL_GENERATION_ENABLED=0`
3. Mantener paid_social PREPARED_OFF
4. Revocar OAuth si alguna vez se conectó

## Kickoff

`POST /api/os/packs/social-calendar-pack/kickoff` · sectores `local` | `ecommerce` | `saas_b2b`
