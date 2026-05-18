import { Deal } from "@/features/deals/types";

/**
 * Shared risk rule for deals list + at-risk panel.
 * Keeps UX and analytics cues aligned in all Revenue views.
 */
export function isDealAtRisk(deal: Deal) {
  const closeDate = deal.expected_close ? new Date(deal.expected_close) : null;
  return Boolean((deal.days_in_stage ?? 0) > 14 || (closeDate && closeDate.getTime() < Date.now()));
}

