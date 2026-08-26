import { NextResponse } from "next/server";

export const NELVYON_AUTH_COOKIE = "nelvyon_token";
/**
 * 8 horas — DEBE coincidir con `JWT_EXPIRES` en `backend/auth/AuthService.ts`.
 * Una cookie mas larga deja al navegador enviando un token ya expirado; una mas
 * corta corta la sesion antes de que el token caduque.
 */
const MAX_AGE_SEC = 60 * 60 * 8;

/**
 * Criterio UNICO de si la cookie va marcada `Secure`.
 *
 * Se exporta para que la cookie del nonce de OAuth use este y no una copia:
 * dos criterios distintos acaban divergiendo, y el que diverge es siempre el
 * de la ruta menos transitada.
 */
export function isSecureContext(): boolean {
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
