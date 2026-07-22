/** CEO gate for partner/affiliate money movement — no SaaS imports (avoid cycles). */

export function isCeoPartnerPayoutEnabled(): boolean {
  return process.env.NELVYON_CEO_PARTNER_PAYOUTS?.trim() === "1";
}

export function assertCeoPartnerPayoutAuthorized(): void {
  if (!isCeoPartnerPayoutEnabled()) {
    throw new Error(
      "CEO_GATE: partner/affiliate payouts disabled. Set NELVYON_CEO_PARTNER_PAYOUTS=1 after CEO approval. Commissions may still be calculated.",
    );
  }
}
