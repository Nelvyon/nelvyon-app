# SECTOR PLAYBOOK — Professional services (consulting, legal-adjacent ops, B2B services)

> Status: **PREPARED_OFF** · Taxonomy: `professional_services`  
> Reuses: `SERVICE_STRATEGY` · `SERVICE_CRM_SALES` · pack `saas-b2b-growth` / `strategy-pack`  
> Teams (refs): `svc_strategy_brand` · `svc_saas_b2b_growth` · `svc_automations_crm`  
> QA ≥ **85** · portal `/portal` · no dedicated professional-services growth pack yet

## Inputs
- firm_name, practice_areas, ICP, primary_cta (demo / consult), compliance constraints

## Kickoff (interim)
`POST /api/os/packs/saas-b2b-growth/kickoff` or `strategy-pack` until a dedicated pack exists

## QA checklist
- [ ] Positioning + offer clear (no invented credentials)
- [ ] Pipeline / nurture copy without spam claims
- [ ] QA ≥85 or `needs_review`
- [ ] No regulated health/education claims (use `health_education_regulated` gate)

## Notes
This playbook documents reuse of existing elite surfaces. Do **not** claim sector-specific certification until a dedicated pack is wired and E2E-verified.
