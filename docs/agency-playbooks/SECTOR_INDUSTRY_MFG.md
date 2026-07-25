# SECTOR PLAYBOOK — Industry / manufacturing

> Status: **PREPARED_OFF** · Taxonomy: `industry_manufacturing`  
> Future cores: `ManufacturingOpsCore` (not in catalog yet) · `ProjectsFieldServiceCore` (Block 29 ops)  
> Teams (refs): `svc_strategy_brand` · `svc_analytics_reporting` · `global_ops_success`  
> QA ≥ **85** when a pack exists · portal `/portal`

## Current gate
Do **not** claim IMPLEMENTED_VERIFIED. `ManufacturingOpsCore` exists in-memory (Block 28) but is **not** wired in `OsCatalogV1` yet — sector stays **PREPARED_OFF**.

## Interim ops surfaces
- Projects / field work orders / SLA / timesheets → `ProjectsFieldServiceCore` (operational, non-GL)
- Strategy / reporting elite teams by reference only

## QA checklist (when pack ships)
- [ ] Plant / site context without inventing certifications
- [ ] Field evidence + checklist completeness
- [ ] Signature / consent remain blocked until legal path
- [ ] QA ≥85 or `needs_review`

## Notes
Promote status only after ManufacturingOpsCore is wired in catalog with real evidence — never via playbook alone.
