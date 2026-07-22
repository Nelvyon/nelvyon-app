/**
 * Shared commission calculation — pure function for partner/affiliate stacks.
 * No payout side effects. CEO gate applies only at markPaid / Stripe Connect.
 */
export type CommissionCalcInput = {
  amountEur: number;
  commissionPct: number;
};

export type CommissionCalcResult = {
  amountEur: number;
  commissionPct: number;
  commissionEur: number;
  payable: false;
  note: string;
};

export function calculatePartnerCommission(input: CommissionCalcInput): CommissionCalcResult {
  const amountEur = Number(input.amountEur);
  const commissionPct = Number(input.commissionPct);
  if (!Number.isFinite(amountEur) || amountEur < 0) {
    throw new Error("amountEur invalid");
  }
  if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) {
    throw new Error("commissionPct invalid");
  }
  const commissionEur = Math.round(amountEur * (commissionPct / 100) * 100) / 100;
  return {
    amountEur,
    commissionPct,
    commissionEur,
    payable: false,
    note: "Calculated only — payout requires NELVYON_CEO_PARTNER_PAYOUTS=1",
  };
}
