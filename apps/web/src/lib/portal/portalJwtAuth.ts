import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export type PortalClaims = {
  portalUserId: string;
  email: string;
  workspaceId: number;
  clientId: string;
  name: string | null;
};

function jwtSecret(): string {
  return process.env.JWT_SECRET_KEY?.trim() || process.env.JWT_SECRET?.trim() || "";
}

export function decodePortalToken(token: string): PortalClaims | null {
  const secret = jwtSecret();
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    if (!payload.portal) return null;
    const sub = payload.sub;
    const clientId = payload.client_id;
    const workspaceRaw = payload.workspace_id;
    if (!sub || !clientId || workspaceRaw == null) return null;
    const workspaceId = Number(workspaceRaw);
    if (!Number.isFinite(workspaceId)) return null;
    return {
      portalUserId: String(sub),
      email: String(payload.email ?? ""),
      workspaceId,
      clientId: String(clientId),
      name: payload.name != null ? String(payload.name) : null,
    };
  } catch {
    return null;
  }
}

export function requirePortalClaims(req: Request): PortalClaims | NextResponse {
  const auth = req.headers.get("authorization")?.trim();
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.slice(7).trim();
  const claims = decodePortalToken(token);
  if (!claims) {
    return NextResponse.json({ error: "Invalid portal token" }, { status: 401 });
  }
  return claims;
}
