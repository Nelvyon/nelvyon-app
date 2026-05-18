import { z } from "zod";

/** Plans where we show a self-serve upgrade CTA in billing. */
export const selfServeEligiblePlanSchema = z.enum(["starter", "pro", "partner"]);

export type SelfServeEligiblePlan = z.infer<typeof selfServeEligiblePlanSchema>;

export function parseSelfServeEligiblePlan(planId: string | undefined): SelfServeEligiblePlan | null {
  const r = selfServeEligiblePlanSchema.safeParse(planId?.toLowerCase());
  return r.success ? r.data : null;
}
