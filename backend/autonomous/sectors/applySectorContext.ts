/** Apply sector profile to brief + artifacts for Phase C/D */

import type { AutonomousSector, SectorProfile } from "./types";
import { getSectorProfile } from "./sectorRegistry";
import { resolveSector } from "./resolveSector";

export interface SectorContextResult {
  sector: AutonomousSector | null;
  profile: SectorProfile | null;
  brief: Record<string, unknown>;
}

export function applySectorContext(
  brief: Record<string, unknown>,
  sectorInput?: AutonomousSector | string | null,
): SectorContextResult {
  const sector = resolveSector(sectorInput, brief);
  if (!sector) {
    return { sector: null, profile: null, brief };
  }

  const profile = getSectorProfile(sector);
  const enrichedBrief: Record<string, unknown> = {
    ...brief,
    sector,
    _sector_context: {
      label: profile.label,
      autonomy_score: profile.autonomy_score,
      sensitivity: profile.sensitivity,
      regulated: profile.regulated,
      requires_legal_review: profile.requires_legal_review,
      ...profile.promptContext,
    },
    compliance_flags: {
      regulated_sector: profile.regulated,
      disclaimer_required: profile.regulated || profile.sensitivity !== "low",
      sector_legal_review: profile.requires_legal_review,
      ...(typeof brief.compliance_flags === "object" && brief.compliance_flags !== null
        ? (brief.compliance_flags as Record<string, unknown>)
        : {}),
    },
  };

  return { sector, profile, brief: enrichedBrief };
}

export function injectSectorArtifacts(
  artifacts: Record<string, unknown>,
  sector: AutonomousSector | null,
  profile: SectorProfile | null,
): Record<string, unknown> {
  if (!sector || !profile) return artifacts;
  return {
    ...artifacts,
    sector_context: {
      sector,
      label: profile.label,
      autonomy_score: profile.autonomy_score,
      sensitivity: profile.sensitivity,
      regulated: profile.regulated,
      winning_offers: profile.promptContext.winning_offers,
      landing_angle: profile.promptContext.landing_angle,
      qa_focus: profile.promptContext.qa_focus,
      templates: profile.promptContext.templates,
      compliance_notes: profile.promptContext.compliance_notes,
      phase: "E",
    },
  };
}
