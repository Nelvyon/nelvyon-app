import { OsAgentError } from "../os-agents/OsAgentError";
import { getAuthService } from "./AuthService";
import type { JwtPayload } from "./types";

function parseCookieToken(cookieHeader: string | null): string | null {
  if (!cookieHeader || cookieHeader.length === 0) return null;
  const segments = cookieHeader.split(";");
  for (const segment of segments) {
    const trimmed = segment.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    if (name !== "nelvyon_token") continue;
    const raw = trimmed.slice(eq + 1).trim();
    if (raw.length === 0) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const t = auth.slice(7).trim();
    if (t.length > 0) return t;
  }
  return parseCookieToken(request.headers.get("cookie"));
}

export async function authenticate(request: Request): Promise<JwtPayload> {
  const token = extractToken(request);
  if (!token) {
    throw new OsAgentError("Unauthorized");
  }
  try {
    return await getAuthService().verifyToken(token);
  } catch (e: unknown) {
    if (e instanceof OsAgentError) {
      throw e;
    }
    throw new OsAgentError("Unauthorized");
  }
}
