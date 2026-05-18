import { ModuleKey } from "@/core/routing/roleMatrix";
import { BrandMode, getBrandMode } from "@/core/platform/brand";

export const INTERNAL_ONLY: readonly string[] = [
  "/sign-in",
  "/analytics",
  "/crm",
  "/automations",
  "/os",
  "/billing/upgrade",
  "/settings",
  "/example",
];

export const CLIENT_PORTAL_ALLOWED: readonly string[] = [
  "/",
  "/auth/signup",
  "/client/sign-in",
  "/account",
  "/app/assistant",
  "/app/advisor",
  "/app/communications",
  "/app/branding",
  "/app/projects",
  "/app/support",
  "/os/workspaces/select",
  "/inbox/tickets",
  "/campaigns",
  "/help",
  "/billing",
];

const CLIENT_ALLOWED_MODULES = new Set<ModuleKey>(["inbox", "campaigns", "help", "billing", "branding", "os"]);

function pathMatches(pathname: string, prefix: string) {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isClientTicketCreateEnabled() {
  return process.env.NEXT_PUBLIC_CLIENT_PORTAL_TICKET_CREATE === "1";
}

export function isPathAllowed(pathname: string, mode: BrandMode = getBrandMode()) {
  if (mode === "internal") return true;
  const path = pathname || "/";
  if (pathMatches(path, "/auth")) return true;
  if (pathMatches(path, "/app/branding/policy")) return false;
  if (pathMatches(path, "/app/branding/preview-v2")) return false;
  if (pathMatches(path, "/os/workspaces/select")) return true;
  if (pathMatches(path, "/os/intake")) return true;
  if (pathMatches(path, "/os/execution")) return true;
  if (isClientTicketCreateEnabled() && pathMatches(path, "/inbox/tickets/new")) return true;
  if (INTERNAL_ONLY.some((prefix) => pathMatches(path, prefix))) return false;
  return CLIENT_PORTAL_ALLOWED.some((prefix) => pathMatches(path, prefix));
}

export function isModuleAllowed(module: ModuleKey, mode: BrandMode = getBrandMode()) {
  if (mode === "internal") return true;
  return CLIENT_ALLOWED_MODULES.has(module);
}

