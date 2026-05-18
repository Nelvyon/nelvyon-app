import { DbClient } from "../db/DbClient";

import { hasReachedLimit } from "./usageService";

export class RateLimitExceededError extends Error {
  constructor(
    public readonly plan: string,
    public readonly limit: number,
  ) {
    super(`Rate limit exceeded for plan ${plan}: ${limit} calls/month`);
    this.name = "RateLimitExceededError";
  }
}

export async function enforceRateLimit(userId: string): Promise<void> {
  const reached = await hasReachedLimit(userId);
  if (!reached) return;

  const db = DbClient.getInstance();
  const subRows = await db.query<{ plan: string }>(
    `SELECT plan FROM subscriptions WHERE user_id::text = $1`,
    [userId],
  );
  let plan = subRows[0]?.plan;
  if (!plan) {
    const userRows = await db.query<{ plan: string }>(`SELECT plan FROM nelvyon_users WHERE user_id = $1`, [userId]);
    plan = userRows[0]?.plan ?? "free";
  }
  const limitRows = await db.query<{ monthly_calls: number }>(
    `SELECT monthly_calls FROM usage_limits WHERE plan = $1`,
    [plan],
  );
  const limit = limitRows[0]?.monthly_calls ?? 10;
  throw new RateLimitExceededError(plan, limit);
}
