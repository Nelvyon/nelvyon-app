import { resolvePackFocus, type PackFocusKey } from "@/lib/saas/packFocusCopy";

export function parseCatalogFocus(raw: unknown): PackFocusKey | undefined {
  if (typeof raw !== "string") return undefined;
  return resolvePackFocus(raw) ?? undefined;
}
