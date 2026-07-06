/** Server-side checkout pricing for funnel checkout steps (content JSON). */
export type FunnelCheckoutStepConfig = {
  amount: number;
  currency: string;
  productName: string;
};

export function parseFunnelCheckoutStepConfig(
  content: string | null,
  stepName: string,
): FunnelCheckoutStepConfig | null {
  if (!content?.trim()) return null;
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const amount =
      typeof parsed.amount === "number"
        ? Math.round(parsed.amount)
        : typeof parsed.priceCents === "number"
          ? Math.round(parsed.priceCents)
          : null;
    if (amount === null || !Number.isFinite(amount) || amount < 50) return null;
    const currency =
      typeof parsed.currency === "string" && /^[a-z]{3}$/i.test(parsed.currency.trim())
        ? parsed.currency.trim().toLowerCase()
        : "eur";
    const productName =
      typeof parsed.productName === "string" && parsed.productName.trim()
        ? parsed.productName.trim().slice(0, 200)
        : stepName.trim().slice(0, 200) || "Checkout";
    return { amount, currency, productName };
  } catch {
    return null;
  }
}
