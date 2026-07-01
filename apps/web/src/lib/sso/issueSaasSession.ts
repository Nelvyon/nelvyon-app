import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import { applyNelvyonAuthCookie } from "@/lib/authCookies";
import { DbClient } from "../../../../../backend/db/DbClient";

export async function issueSaasSessionRedirect(params: {
  tenantId: string;
  userId: string;
  email: string;
  redirectPath?: string;
}): Promise<NextResponse> {
  const secret = process.env.JWT_SECRET ?? "";
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET not configured");
  }

  const db = DbClient.getInstance();
  const rows = await db.query<{ plan: string }>(
    `SELECT plan FROM saas_tenants WHERE id=$1 LIMIT 1`,
    [params.tenantId],
  );
  const plan = rows[0]?.plan ?? "starter";

  const token = jwt.sign(
    {
      userId: params.userId,
      email: params.email,
      tenantId: params.tenantId,
      plan,
      via: "sso",
    },
    secret,
    { expiresIn: "8h" },
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = NextResponse.redirect(new URL(params.redirectPath ?? "/saas/dashboard", appUrl));
  applyNelvyonAuthCookie(res, token);
  return res;
}
