import type { DbClient } from "../db/DbClient";
import { getSaasLoyaltyService } from "./SaasLoyaltyService";

/** Award loyalty points when Stripe checkout metadata includes contact_id + purchase amount. */
export async function maybeEarnLoyaltyFromCheckout(
  db: DbClient,
  tenantId: string,
  metadata: Record<string, string> | null | undefined,
  amountTotalCents: number | null | undefined,
  referenceId: string,
): Promise<void> {
  const contactId = metadata?.contact_id?.trim();
  if (!contactId) return;

  const eurAmount = (amountTotalCents ?? 0) / 100;
  if (eurAmount <= 0) return;

  const program = await db.query<{ active: boolean }>(
    `SELECT active FROM saas_loyalty_programs WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  if (program[0] && program[0].active === false) return;

  try {
    await getSaasLoyaltyService().earnPoints(
      tenantId,
      contactId,
      eurAmount,
      "stripe_checkout",
      referenceId,
    );
  } catch {
    // Non-fatal: invalid contact or inactive program
  }
}
