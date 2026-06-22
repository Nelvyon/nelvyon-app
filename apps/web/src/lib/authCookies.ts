import { NextResponse } from "next/server";

export const NELVYON_AUTH_COOKIE = "nelvyon_token";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function isSecureContext(): boolean {
  if (process.env.NODE_ENV === "production") return true;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return appUrl.startsWith("https://");
}

function cookieBase() {
  return {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "strict" as const,
    path: "/",
  };
}

export function applyNelvyonAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(NELVYON_AUTH_COOKIE, token, {
    ...cookieBase(),
    maxAge: MAX_AGE_SEC,
  });
}

export function clearNelvyonAuthCookie(res: NextResponse): void {
  res.cookies.set(NELVYON_AUTH_COOKIE, "", {
    ...cookieBase(),
    maxAge: 0,
  });
}
