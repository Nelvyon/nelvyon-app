import { NextResponse } from "next/server";

import { verifyEmailToken } from "@nelvyon/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  if (!token) {
    return NextResponse.redirect(`${appUrl}/auth/verify-email?status=invalid`);
  }
  const result = await verifyEmailToken(token);
  return NextResponse.redirect(`${appUrl}/auth/verify-email?status=${result}`);
}
