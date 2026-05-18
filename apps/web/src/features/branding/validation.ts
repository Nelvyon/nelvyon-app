/** WHITE-LABEL / BRANDING NELVYON v1 — client-side checks for tenant markers. */

export function parseHexColor(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const v = t.startsWith("#") ? t : `#${t}`;
  return /^#[0-9A-Fa-f]{6}$/.test(v) ? v : null;
}

export function validateHttpsLogoUrl(raw: string): { ok: true } | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true };
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") {
      return { ok: false, message: "Logo URL must start with https:// (HTTP is not supported here)." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Enter a valid URL for the logo." };
  }
}
