# SECTOR TAXONOMY — Canonical (Block 35)

> SSOT code: `backend/agency/SectorCapabilityTaxonomy.ts`  
> Elite teams: **reference only** → `OsProfessionalTeams` `teamId` strings (never duplicated here)

## Status vocabulary

| Status | Meaning |
|--------|---------|
| `IMPLEMENTED_VERIFIED` | Mapped to **real** existing OS packs and/or service playbooks |
| `PREPARED_OFF` | Playbook / mapping drafted; not a certified sector go-live |
| `NOT_IMPLEMENTED` | No mapping |
| `BLOCKED_LEGAL` | Legal/compliance gate — no activation without written counsel |

## Canonical sectors

| id | status | Real mapping |
|----|--------|----------------|
| `local_smb` | **IMPLEMENTED_VERIFIED** | pack `local-business-growth` · `SECTOR_LOCAL_SMB.md` |
| `ecommerce` | **IMPLEMENTED_VERIFIED** | pack `ecommerce-growth` · `SECTOR_ECOMMERCE.md` |
| `saas_b2b` | **IMPLEMENTED_VERIFIED** | pack `saas-b2b-growth` · `SECTOR_SAAS_B2B.md` |
| `agency_marketing` | **IMPLEMENTED_VERIFIED** | `SERVICE_CONTENT_SOCIAL` + social/content/brand packs · team `svc_social_creative` |
| `professional_services` | **PREPARED_OFF** | reuses strategy + saas-b2b surfaces · `SECTOR_PROFESSIONAL_SERVICES.md` |
| `retail` | **PREPARED_OFF** | reuses ecommerce path · `SECTOR_RETAIL.md` |
| `industry_manufacturing` | **PREPARED_OFF** | until `ManufacturingOpsCore` in catalog · `SECTOR_INDUSTRY_MFG.md` |
| `health_education_regulated` | **BLOCKED_LEGAL** | regulated note only — no sector playbook / no pack |

## APIs

```ts
listSectorPlaybooks()
getSector(id)
assertSectorTaxonomyIntegrity()
```

## Rules

- Never mark `IMPLEMENTED_VERIFIED` without a real pack id and/or existing `SERVICE_*` / sector playbook on disk
- Never invent elite team definitions — only `OsTeamId` refs
- CRM sales path uses team `svc_automations_crm` (there is no `svc_crm_sales` team id)
- Wired into `OsCatalogV1` **v1.7.0** (`sector_capability_taxonomy`) and `backend/agency/index.ts` · UI `/saas/erp/sectors`
