import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { requireHmacSecret } from "../../../../../backend/saas/hmacSecret";
import { isSecureContext } from "@/lib/authCookies";

const MAX_AGE_MS = 10 * 60 * 1000;

/**
 * La cookie que ata el flujo al NAVEGADOR que lo empezó.
 *
 * El `state` firmado prueba quién EMPEZÓ el flujo. No prueba quién lo está
 * TERMINANDO, y esa es la pregunta que decide a nombre de quién se guardan los
 * tokens del proveedor. Sin esta cookie el ataque es de manual: el atacante
 * arranca el flujo en su cuenta, obtiene una URL de consentimiento con su
 * `state` legítimo, se la manda a la víctima, y los tokens de Google de la
 * víctima acaban colgados de la cuenta NELVYON del atacante.
 *
 * `sameSite: "lax"` y no `"strict"`: el callback llega como una navegación de
 * primer nivel DESDE el proveedor, que es otro sitio. Con `strict` el navegador
 * no manda la cookie y los cinco flujos legítimos dejarían de funcionar — que es
 * exactamente por lo que no sirve reutilizar aquí la cookie de sesión de
 * NELVYON, que sí es `strict`. Comprobado antes de escribir esto, no después.
 */
export const NONCE_COOKIE = "nelvyon_oauth_nonce";

/** Diez minutos, como el `state`. Más no sirve de nada y amplía la ventana. */
export const MAX_AGE_NONCE_SEG = 10 * 60;

function oauthSecret(): string {
  return requireHmacSecret();
}

type OAuthStatePayload = { userId: string; ts: number; nonce?: string };

function signPayload(payload: OAuthStatePayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", oauthSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function hashNonce(nonce: string): string {
  return createHmac("sha256", oauthSecret()).update(nonce).digest("base64url");
}

/**
 * Arranca un flujo: `state` firmado + el nonce que hay que dejar en la cookie.
 *
 * Lo que viaja dentro del `state` es el HASH del nonce, no el nonce. El `state`
 * va por la barra de direcciones, queda en los registros del proveedor y en el
 * historial del navegador; el nonce en claro no tiene por qué estar ahí.
 */
export function crearEstadoOAuth(userId: string): { state: string; nonce: string } {
  const nonce = randomBytes(32).toString("base64url");
  return {
    state: signPayload({ userId, ts: Date.now(), nonce: hashNonce(nonce) }),
    nonce,
  };
}

/** Deja la cookie del nonce en la respuesta que redirige al proveedor. */
export function aplicarCookieDeNonce(res: NextResponse, nonce: string): void {
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/api/oauth",
    maxAge: MAX_AGE_NONCE_SEG,
  });
}

/** Borra la cookie una vez usada: un nonce sirve para un flujo y para uno solo. */
export function limpiarCookieDeNonce(res: NextResponse): void {
  res.cookies.set(NONCE_COOKIE, "", {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/api/oauth",
    maxAge: 0,
  });
}

/**
 * Lee la cookie por su nombre EXACTO.
 *
 * Con un `includes`, `nelvyon_oauth_nonce_x` y `xnelvyon_oauth_nonce` pasarían
 * por la buena — que es como se cuela un valor bajo otro nombre. Es el mismo
 * defecto que se buscó (y no se encontró) en la cookie de sesión.
 */
function nonceDeLaPeticion(req: Request): string | null {
  const bruto = req.headers.get("cookie") ?? "";
  for (const trozo of bruto.split(";")) {
    const igual = trozo.indexOf("=");
    if (igual < 0) continue;
    if (trozo.slice(0, igual).trim() !== NONCE_COOKIE) continue;
    const valor = trozo.slice(igual + 1).trim();
    return valor.length ? valor : null;
  }
  return null;
}

/** ¿Trae este navegador el nonce del flujo que dice estar terminando? */
export function verificarNonceDelNavegador(
  req: Request,
  payload: OAuthStatePayload,
): boolean {
  if (!payload.nonce) return false; // Un `state` sin nonce es de antes: no vale.
  const presentado = nonceDeLaPeticion(req);
  if (!presentado) return false;
  let esperado: string;
  try {
    esperado = hashNonce(presentado);
  } catch {
    return false;
  }
  const a = Buffer.from(esperado);
  const b = Buffer.from(payload.nonce);
  // La longitud se compara antes: `timingSafeEqual` lanza con longitudes
  // distintas, y un prefijo nunca llegaría a compararse.
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Verify signature + expiry; returns null if invalid or expired. */
export function parseOAuthState(state: string | null): OAuthStatePayload | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [data, sig] = parts as [string, string];
  let secret: string;
  try {
    secret = oauthSecret();
  } catch {
    return null;
  }

  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return null;
  }

  if (!payload.userId || typeof payload.ts !== "number") return null;
  if (Date.now() - payload.ts > MAX_AGE_MS) return null;
  return payload;
}
