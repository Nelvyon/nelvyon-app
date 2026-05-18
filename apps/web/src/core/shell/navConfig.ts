import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CreditCard,
  CircleHelp,
  History,
  Inbox,
  Megaphone,
  Settings,
  Users,
  Workflow,
} from "lucide-react";

import { UserRole } from "@/core/auth/types";
import { BrandMode } from "@/core/platform/brand";
import { isModuleAllowed } from "@/core/platform/surfacePolicy";
import { ModuleKey, can } from "@/core/routing/roleMatrix";

export interface ProductNavItem {
  label: string;
  href: string;
  prefix: string;
  module: ModuleKey;
  icon: LucideIcon;
}

export const PRODUCT_NAV: readonly ProductNavItem[] = [
  /** Revenue = clients + deals pipeline in one commercial workspace story (X-EXEC QW1). */
  { label: "Revenue", href: "/crm/clients", prefix: "/crm", module: "crm", icon: Users },
  { label: "Inbox", href: "/inbox/tickets", prefix: "/inbox", module: "inbox", icon: Inbox },
  { label: "Campaigns", href: "/campaigns", prefix: "/campaigns", module: "campaigns", icon: Megaphone },
  {
    label: "Automations",
    href: "/automations/jobs",
    prefix: "/automations",
    module: "automations",
    icon: Workflow,
  },
  { label: "Billing", href: "/billing", prefix: "/billing", module: "billing", icon: CreditCard },
  { label: "Settings", href: "/settings", prefix: "/settings", module: "settings", icon: Settings },
  { label: "OS", href: "/os", prefix: "/os", module: "os", icon: Activity },
  { label: "Historial", href: "/dashboard/history", prefix: "/dashboard", module: "os", icon: History },
  { label: "Help", href: "/help", prefix: "/help", module: "help", icon: CircleHelp },
] as const;

function labelForMode(item: ProductNavItem, mode: BrandMode): string {
  if (mode === "internal") return item.label;
  if (item.module === "inbox") return "Requests";
  if (item.module === "campaigns") return "Projects";
  if (item.module === "billing") return "Billing";
  if (item.module === "help") return "Support";
  return item.label;
}

export function getNavItemsForRole(role: UserRole, mode: BrandMode = "internal"): ProductNavItem[] {
  return PRODUCT_NAV.filter((item) => (mode === "client" ? isModuleAllowed(item.module, mode) : can(role, item.module, "view") && isModuleAllowed(item.module, mode))).map((item) => ({
    ...item,
    label: labelForMode(item, mode),
  }));
}

export function isNavActive(pathname: string, item: ProductNavItem) {
  if (pathname === item.href) return true;
  return pathname.startsWith(`${item.prefix}/`) || pathname === item.prefix;
}
