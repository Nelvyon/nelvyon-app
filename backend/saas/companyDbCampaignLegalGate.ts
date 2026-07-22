/**
 * Company DB / bulk campaign legal gate — observability only by default.
 * Does NOT enable sends. Does NOT import company DBs.
 * BLOQUEADO_LEGAL until CEO+legal set NELVYON_COMPANY_DB_CAMPAIGNS_LEGAL=1
 * after signing docs/COMPLIANCE_COMPANY_DB_CHECKLIST.md.
 */
export type CompanyDbLegalStatus = {
  signedEnv: boolean;
  blockedLabel: "BLOQUEADO_LEGAL" | "LEGAL_ENV_SET";
  note: string;
};

export function getCompanyDbCampaignLegalStatus(): CompanyDbLegalStatus {
  const signedEnv = process.env.NELVYON_COMPANY_DB_CAMPAIGNS_LEGAL?.trim() === "1";
  return {
    signedEnv,
    blockedLabel: signedEnv ? "LEGAL_ENV_SET" : "BLOQUEADO_LEGAL",
    note: signedEnv
      ? "Env marker set — still requires human checklist evidence; does not auto-approve scraping."
      : "Checklist unsigned — no company DB import; campaigns remain ops-gated by policy.",
  };
}

/**
 * Extract optional source_trace from audience filter JSON (honesty / audit).
 */
export function extractAudienceSourceTrace(
  audienceFilter: Record<string, unknown> | null | undefined,
): string | null {
  if (!audienceFilter || typeof audienceFilter !== "object") return null;
  const raw =
    audienceFilter.source_trace ??
    audienceFilter.sourceTrace ??
    audienceFilter.list_source ??
    audienceFilter.listSource;
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 200);
  return null;
}

export function buildCampaniaLegalAuditDetails(input: {
  totalSent: number;
  audienceFilter?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const legal = getCompanyDbCampaignLegalStatus();
  return {
    totalSent: input.totalSent,
    legalGate: legal.blockedLabel,
    sourceTrace: extractAudienceSourceTrace(input.audienceFilter),
  };
}
