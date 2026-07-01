import { createRemoteJWKSet, jwtVerify } from "jose";

export async function verifyOidcIdToken(params: {
  idToken: string;
  issuer: string;
  clientId: string;
  jwksUri?: string;
}): Promise<Record<string, unknown>> {
  const issuer = params.issuer.replace(/\/$/, "");
  const jwksUrl = params.jwksUri ?? `${issuer}/.well-known/jwks.json`;
  const JWKS = createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(params.idToken, JWKS, {
    issuer,
    audience: params.clientId,
  });
  return payload as Record<string, unknown>;
}

export function buildOidcTokenUrl(issuer: string): string {
  const base = issuer.replace(/\/$/, "");
  if (base.endsWith("/token")) return base;
  return `${base}/token`;
}
