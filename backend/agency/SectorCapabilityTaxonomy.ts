/**
 * Canonical sector capability taxonomy (NELVYON Block 35).
 *
 * Honest inventory of agency sectors. IMPLEMENTED_VERIFIED only when mapped to
 * REAL existing OS packs / service playbooks. Elite teams are referenced by
 * OsProfessionalTeams `teamId` strings — never duplicated here.
 *
 * Exported from `backend/agency/index.ts` and catalogued in OsCatalogV1 v1.7.0.
 */

import { OS_PROFESSIONAL_TEAMS, type OsTeamId } from "./OsProfessionalTeams";

export type SectorCapabilityStatus =
  | "IMPLEMENTED_VERIFIED"
  | "PREPARED_OFF"
  | "NOT_IMPLEMENTED"
  | "BLOCKED_LEGAL";

export type SectorId =
  | "local_smb"
  | "ecommerce"
  | "saas_b2b"
  | "professional_services"
  | "agency_marketing"
  | "retail"
  | "industry_manufacturing"
  | "health_education_regulated";

export type SectorCapabilityEntry = {
  id: SectorId;
  title: string;
  status: SectorCapabilityStatus;
  /** Existing OS pack ids and/or future core module names. */
  mappedModules: readonly string[];
  /** Paths under docs/agency-playbooks/ that exist for this sector mapping. */
  playbookPaths: readonly string[];
  /** OsProfessionalTeams teamId string refs — do not duplicate team defs. */
  eliteTeamIds: readonly OsTeamId[];
  note: string;
  regulatedNote?: string;
};

const EXISTING_PACK_IDS = new Set([
  "local-business-growth",
  "ecommerce-growth",
  "saas-b2b-growth",
  "social-calendar-pack",
  "content-strategy-pack",
  "brand-voice-pack",
  "strategy-pack",
  "funnel-pack",
  "retention-ops-pack",
]);

export const SECTOR_CAPABILITY_TAXONOMY: readonly SectorCapabilityEntry[] = [
  {
    id: "local_smb",
    title: "Local / SMB",
    status: "IMPLEMENTED_VERIFIED",
    mappedModules: ["local-business-growth", "SERVICE_SEO", "SERVICE_WEB_LANDING", "SERVICE_SUPPORT"],
    playbookPaths: ["docs/agency-playbooks/SECTOR_LOCAL_SMB.md"],
    eliteTeamIds: ["svc_web_ux_cro", "svc_seo_content", "svc_retention_reputation"],
    note: "Mapped to certified pack local-business-growth + existing sector playbook.",
  },
  {
    id: "ecommerce",
    title: "Ecommerce / DTC",
    status: "IMPLEMENTED_VERIFIED",
    mappedModules: ["ecommerce-growth", "SERVICE_ECOMMERCE", "SERVICE_ADS"],
    playbookPaths: ["docs/agency-playbooks/SECTOR_ECOMMERCE.md"],
    eliteTeamIds: ["svc_ecommerce_growth", "svc_ads_attribution", "svc_web_ux_cro"],
    note: "Mapped to certified pack ecommerce-growth + existing sector playbook.",
  },
  {
    id: "saas_b2b",
    title: "SaaS B2B",
    status: "IMPLEMENTED_VERIFIED",
    mappedModules: ["saas-b2b-growth", "SERVICE_CRM_SALES", "SERVICE_EMAIL", "SERVICE_WEB_LANDING"],
    playbookPaths: ["docs/agency-playbooks/SECTOR_SAAS_B2B.md"],
    eliteTeamIds: ["svc_saas_b2b_growth", "svc_automations_crm", "svc_email_lifecycle"],
    note: "Mapped to certified pack saas-b2b-growth + existing sector playbook. CRM path uses svc_automations_crm (no svc_crm_sales team id).",
  },
  {
    id: "professional_services",
    title: "Professional services",
    status: "PREPARED_OFF",
    mappedModules: ["strategy-pack", "saas-b2b-growth", "SERVICE_STRATEGY", "SERVICE_CRM_SALES"],
    playbookPaths: ["docs/agency-playbooks/SECTOR_PROFESSIONAL_SERVICES.md"],
    eliteTeamIds: ["svc_strategy_brand", "svc_saas_b2b_growth", "svc_automations_crm"],
    note: "Playbook prepared; no dedicated growth pack certified for this sector yet — reuses strategy + SaaS B2B surfaces.",
  },
  {
    id: "agency_marketing",
    title: "Agency / marketing ops",
    status: "IMPLEMENTED_VERIFIED",
    mappedModules: [
      "social-calendar-pack",
      "content-strategy-pack",
      "brand-voice-pack",
      "SERVICE_CONTENT_SOCIAL",
    ],
    playbookPaths: ["docs/agency-playbooks/SERVICE_CONTENT_SOCIAL.md"],
    eliteTeamIds: ["svc_social_creative", "svc_strategy_brand", "svc_seo_content"],
    note: "Mapped to elite content_social + social/content/brand packs and SERVICE_CONTENT_SOCIAL playbook.",
  },
  {
    id: "retail",
    title: "Retail",
    status: "PREPARED_OFF",
    mappedModules: ["ecommerce-growth", "SERVICE_ECOMMERCE", "SERVICE_ADS"],
    playbookPaths: ["docs/agency-playbooks/SECTOR_RETAIL.md"],
    eliteTeamIds: ["svc_ecommerce_growth", "svc_ads_attribution", "svc_retention_reputation"],
    note: "Prepared playbook; operational path reuses ecommerce-growth until a retail-specific pack exists.",
  },
  {
    id: "industry_manufacturing",
    title: "Industry / manufacturing",
    status: "PREPARED_OFF",
    mappedModules: ["ManufacturingOpsCore", "ProjectsFieldServiceCore"],
    playbookPaths: ["docs/agency-playbooks/SECTOR_INDUSTRY_MFG.md"],
    eliteTeamIds: ["svc_strategy_brand", "svc_analytics_reporting", "global_ops_success"],
    note:
      "ManufacturingOpsCore + ProjectsFieldServiceCore are catalogued (v1.7.0); sector stays PREPARED_OFF until a dedicated industry growth pack exists (no silent promote).",
  },
  {
    id: "health_education_regulated",
    title: "Health / education (regulated)",
    status: "BLOCKED_LEGAL",
    mappedModules: [],
    playbookPaths: [],
    eliteTeamIds: ["global_security_compliance"],
    note: "No regulated-sector go-live path without legal counsel and compliance program.",
    regulatedNote:
      "Health/education sectors require jurisdiction-specific consent, PHI/PII controls, and written legal approval before any pack or outreach is enabled.",
  },
] as const;

const BY_ID = new Map(SECTOR_CAPABILITY_TAXONOMY.map((s) => [s.id, s]));

export function listSectorPlaybooks(): SectorCapabilityEntry[] {
  return SECTOR_CAPABILITY_TAXONOMY.map((s) => ({ ...s, mappedModules: [...s.mappedModules], playbookPaths: [...s.playbookPaths], eliteTeamIds: [...s.eliteTeamIds] }));
}

export function getSector(id: SectorId): SectorCapabilityEntry | undefined {
  const s = BY_ID.get(id);
  if (!s) return undefined;
  return {
    ...s,
    mappedModules: [...s.mappedModules],
    playbookPaths: [...s.playbookPaths],
    eliteTeamIds: [...s.eliteTeamIds],
  };
}

const KNOWN_TEAM_IDS = new Set(OS_PROFESSIONAL_TEAMS.map((t) => t.teamId));

const CANONICAL_SECTOR_IDS: readonly SectorId[] = [
  "local_smb",
  "ecommerce",
  "saas_b2b",
  "professional_services",
  "agency_marketing",
  "retail",
  "industry_manufacturing",
  "health_education_regulated",
];

export function assertSectorTaxonomyIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const seen = new Set<string>();

  for (const id of CANONICAL_SECTOR_IDS) {
    if (!BY_ID.has(id)) violations.push(`missing_canonical_sector:${id}`);
  }

  if (SECTOR_CAPABILITY_TAXONOMY.length !== CANONICAL_SECTOR_IDS.length) {
    violations.push("sector_count_mismatch");
  }

  for (const sector of SECTOR_CAPABILITY_TAXONOMY) {
    if (seen.has(sector.id)) violations.push(`duplicate_sector:${sector.id}`);
    seen.add(sector.id);

    if (!sector.title.trim()) violations.push(`missing_title:${sector.id}`);

    for (const teamId of sector.eliteTeamIds) {
      if (!KNOWN_TEAM_IDS.has(teamId)) {
        violations.push(`unknown_elite_team_ref:${sector.id}:${teamId}`);
      }
    }

    if (sector.status === "IMPLEMENTED_VERIFIED") {
      if (sector.mappedModules.length === 0) {
        violations.push(`verified_without_mapping:${sector.id}`);
      }
      if (sector.playbookPaths.length === 0) {
        violations.push(`verified_without_playbook:${sector.id}`);
      }
      const hasRealPackOrService = sector.mappedModules.some(
        (m) => EXISTING_PACK_IDS.has(m) || m.startsWith("SERVICE_"),
      );
      if (!hasRealPackOrService) {
        violations.push(`verified_without_real_pack_or_service:${sector.id}`);
      }
    }

    if (sector.id === "industry_manufacturing" && sector.status !== "PREPARED_OFF") {
      violations.push("industry_manufacturing_must_stay_prepared_off_until_dedicated_pack");
    }

    if (sector.id === "health_education_regulated") {
      if (sector.status !== "BLOCKED_LEGAL" && sector.status !== "PREPARED_OFF") {
        violations.push("health_education_regulated_must_be_blocked_or_prepared_off");
      }
      if (!sector.regulatedNote) {
        violations.push("health_education_regulated_missing_regulated_note");
      }
      if (sector.status === "IMPLEMENTED_VERIFIED") {
        violations.push("health_education_regulated_must_never_be_verified_without_legal");
      }
    }
  }

  return { ok: violations.length === 0, violations };
}
