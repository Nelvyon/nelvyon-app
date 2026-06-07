/** Phase E — sector-specific QA checks (threshold still >= 85 global) */

import type { AutonomousSku } from "../types";
import type { AutonomousSector, SectorQaCheck } from "./types";
import { getSectorProfile } from "./sectorRegistry";

function hasDisclaimer(artifacts: Record<string, unknown>): boolean {
  const copy = artifacts.copy as { disclaimer?: string; legal_disclaimer?: string } | undefined;
  const kb = artifacts.config as { disclaimer?: string } | undefined;
  const chatbotKb = artifacts.kb as { disclaimer?: string } | undefined;
  const text = [
    copy?.disclaimer,
    copy?.legal_disclaimer,
    kb?.disclaimer,
    chatbotKb?.disclaimer,
  ]
    .filter(Boolean)
    .join(" ");
  return text.length > 10;
}

function briefHasCompliance(brief: Record<string, unknown>): boolean {
  const flags = brief.compliance_flags as Record<string, unknown> | undefined;
  if (flags?.disclaimer_required && flags?.regulated_sector) return true;
  const ctx = brief._sector_context as Record<string, unknown> | undefined;
  return Boolean(ctx?.compliance_notes);
}

export function runSectorQaChecks(
  sector: AutonomousSector,
  sku: AutonomousSku,
  brief: Record<string, unknown>,
  artifacts: Record<string, unknown>,
): SectorQaCheck[] {
  const profile = getSectorProfile(sector);
  const checks: SectorQaCheck[] = [];

  checks.push({
    id: "SEC-CTX-01",
    passed: Boolean(artifacts.sector_context || brief._sector_context),
    blocking: false,
    message: "Sector context injected",
  });

  if (profile.regulated) {
    const disclaimerOk =
      hasDisclaimer(artifacts) ||
      briefHasCompliance(brief) ||
      sku === "NELVYON-SEO";
    checks.push({
      id: "SEC-REG-01",
      passed: disclaimerOk,
      blocking: true,
      message: disclaimerOk
        ? "Regulated sector compliance context present"
        : "Regulated sector requires disclaimer/compliance flags in output",
    });
  }

  if (profile.sensitivity === "high") {
    checks.push({
      id: "SEC-ESC-01",
      passed: true,
      blocking: false,
      message: "High-sensitivity sector — operator review required before client delivery",
    });
  }

  const sectorCtx = artifacts.sector_context as { templates?: string[] } | undefined;
  checks.push({
    id: "SEC-TPL-01",
    passed: Boolean(sectorCtx?.templates?.length || profile.promptContext.templates.length),
    blocking: false,
    message: "Sector templates mapped",
  });

  return checks;
}

export function requiresOperatorEscalation(sector: AutonomousSector): boolean {
  return getSectorProfile(sector).escalate_operator_on_pass;
}

export function applySectorQaToScore(
  baseScore: number,
  checks: SectorQaCheck[],
): { score: number; blocking: SectorQaCheck[] } {
  const blocking = checks.filter((c) => c.blocking && !c.passed);
  let score = baseScore;
  if (blocking.length > 0 && score >= 85) score = 84;
  return { score, blocking };
}
