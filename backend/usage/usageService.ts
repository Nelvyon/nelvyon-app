import { DbClient } from "../db/DbClient";

export interface UsageSummary {
  plan: string;
  monthlyLimit: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  percentUsed: number;
  lastResetAt: string;
}

export async function trackUsage(userId: string, agentId: string, sector: string): Promise<void> {
  const db = DbClient.getInstance();
  await db.query(`INSERT INTO usage_events (user_id, agent_id, sector) VALUES ($1, $2, $3)`, [userId, agentId, sector]);
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
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
  const limitRows = await db.query<{ monthly_calls: number }>(`SELECT monthly_calls FROM usage_limits WHERE plan = $1`, [plan]);
  const monthlyLimit = limitRows[0]?.monthly_calls ?? 10;
  const usageRows = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM usage_events
     WHERE user_id = $1
       AND date_trunc('month', created_at) = date_trunc('month', now())`,
    [userId],
  );
  const usedThisMonth = parseInt(usageRows[0]?.count ?? "0", 10);
  const remainingThisMonth = Math.max(0, monthlyLimit - usedThisMonth);
  const percentUsed =
    monthlyLimit > 0 ? Math.min(100, Math.round((usedThisMonth / monthlyLimit) * 100)) : 0;
  const now = new Date();
  const lastResetAt = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return {
    plan,
    monthlyLimit,
    usedThisMonth,
    remainingThisMonth,
    percentUsed,
    lastResetAt,
  };
}

export async function hasReachedLimit(userId: string): Promise<boolean> {
  const summary = await getUsageSummary(userId);
  return summary.usedThisMonth >= summary.monthlyLimit;
}
