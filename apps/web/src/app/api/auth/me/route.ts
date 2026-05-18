import { NextResponse } from "next/server";

import { authenticate, getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const auth = getAuthService();
    const profile = await auth.getUserProfile(claims.userId);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      userId: profile.userId,
      email: profile.email,
      tenantId: profile.tenantId,
      plan: profile.plan,
      fullName: profile.fullName,
    });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
