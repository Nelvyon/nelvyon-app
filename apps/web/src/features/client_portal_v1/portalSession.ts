export const PORTAL_JWT_SESSION_KEY = "nelvyon.portal.jwt";

export function readPortalJwt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(PORTAL_JWT_SESSION_KEY);
  } catch {
    return null;
  }
}

export function writePortalJwt(token: string): void {
  try {
    sessionStorage.setItem(PORTAL_JWT_SESSION_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearPortalJwt(): void {
  try {
    sessionStorage.removeItem(PORTAL_JWT_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
