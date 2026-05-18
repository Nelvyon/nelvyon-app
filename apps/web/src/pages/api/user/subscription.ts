import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../backend/db/DbClient";

type Plan = "free" | "starter" | "pro" | "agency";
type Status = "inactive" | "active" | "canceled" | "past_due";

function coercePlan(v: string): Plan {
  if (v === "starter" || v === "pro" || v === "agency" || v === "free") return v;
  return "free";
}

function coerceStatus(v: string): Status {
  if (v === "active" || v === "canceled" || v === "past_due" || v === "inactive") return v;
  return "inactive";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const token = req.cookies.nelvyon_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  let user: { userId: string };
  try {
    user = await getAuthService().verifyToken(token);
  } catch (e: unknown) {
    if (e instanceof OsAgentError) return res.status(401).json({ error: "Unauthorized" });
    throw e;
  }
  const db = DbClient.getInstance();
  const rows = await db.query<{
    plan: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  }>(
    `SELECT plan, status, current_period_end, cancel_at_period_end
     FROM subscriptions WHERE user_id = $1::uuid`,
    [user.userId],
  );
  if (!rows.length) {
    return res.status(200).json({
      plan: "free",
      status: "inactive",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }
  const row = rows[0]!;
  return res.status(200).json({
    plan: coercePlan(row.plan),
    status: coerceStatus(row.status),
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  });
}
