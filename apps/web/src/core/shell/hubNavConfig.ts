import type { LucideIcon } from "lucide-react";
import {
  Activity,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  ShoppingBag,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import { UserRole } from "@/core/auth/types";
import { BrandMode } from "@/core/platform/brand";
import type { ProductLayer } from "@/core/product/productLayer";
import {
  getNavItemsForRole,
  isNavActive,
  type ProductNavItem,
} from "@/core/shell/navConfig";

export type NavHubId =
  | "inicio"
  | "clientes"
  | "marketing"
  | "ventas"
  | "automation"
  | "growth"
  | "agency"
  | "saas"
  | "more";

export interface NavHubSection {
  id: NavHubId;
  label: string;
  icon: LucideIcon;
  items: ProductNavItem[];
}

type HubBlueprint = {
  id: NavHubId;
  label: string;
  icon: LucideIcon;
  hrefs: readonly string[];
};

const WORKSPACE_HUB_BLUEPRINTS: readonly HubBlueprint[] = [
  {
    id: "inicio",
    label: "Inicio",
    icon: LayoutDashboard,
    hrefs: ["/dashboard"],
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: Users,
    hrefs: [
      "/crm",
      "/dashboard/inbox",
      "/inbox/tickets",
      "/dashboard/calendario",
      "/dashboard/reservas",
      "/dashboard/live-chat",
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    hrefs: [
      "/publicidad",
      "/social",
      "/campaigns",
      "/dashboard/sms",
      "/funnels",
      "/dashboard/landing-pages",
      "/dashboard/websites",
      "/dashboard/seo",
      "/reputacion",
    ],
  },
  {
    id: "ventas",
    label: "Ventas / Revenue",
    icon: ShoppingBag,
    hrefs: ["/ecommerce", "/billing", "/dashboard/contratos"],
  },
  {
    id: "automation",
    label: "Automatización & IA",
    icon: Workflow,
    hrefs: ["/automatizacion", "/dashboard/ia", "/dashboard/ai-model", "/dashboard/chatbot"],
  },
  {
    id: "growth",
    label: "OS / Growth",
    icon: Zap,
    hrefs: [
      "/os/packs",
      "/os/dashboard",
      "/dashboard/executive-reports",
      "/dashboard/analytics/benchmarks",
      "/dashboard/reportes",
    ],
  },
  {
    id: "more",
    label: "Más",
    icon: MoreHorizontal,
    hrefs: [
      "/dashboard/settings",
      "/dashboard/white-label",
      "/dashboard/api-keys",
      "/dashboard/storage",
      "/dashboard/afiliados",
      "/dashboard/cdp",
      "/dashboard/cursos",
      "/dashboard/formularios",
      "/dashboard/history",
      "/help",
    ],
  },
] as const;

const AGENCY_HUB_BLUEPRINTS: readonly HubBlueprint[] = [
  {
    id: "agency",
    label: "Control Agencia",
    icon: Activity,
    hrefs: ["/os/dashboard", "/os/clientes", "/os/packs"],
  },
  {
    id: "growth",
    label: "Growth Packs",
    icon: Zap,
    hrefs: ["/os/packs"],
  },
  {
    id: "saas",
    label: "SaaS & Partners",
    icon: Sparkles,
    hrefs: ["/dashboard/white-label", "/billing", "/dashboard/afiliados", "/dashboard/executive-reports"],
  },
  {
    id: "inicio",
    label: "Workspace",
    icon: LayoutDashboard,
    hrefs: ["/dashboard"],
  },
] as const;

function resolveHubSections(
  blueprints: readonly HubBlueprint[],
  allowed: ProductNavItem[],
): NavHubSection[] {
  const byHref = new Map(allowed.map((item) => [item.href, item]));
  const used = new Set<string>();

  const sections: NavHubSection[] = [];
  for (const hub of blueprints) {
    const items: ProductNavItem[] = [];
    for (const href of hub.hrefs) {
      const item = byHref.get(href);
      if (item && !used.has(href)) {
        items.push(item);
        used.add(href);
      }
    }
    if (items.length > 0) {
      sections.push({ id: hub.id, label: hub.label, icon: hub.icon, items });
    }
  }

  const orphan = allowed.filter((item) => !used.has(item.href));
  if (orphan.length > 0) {
    const more = sections.find((s) => s.id === "more");
    if (more) {
      more.items.push(...orphan);
    } else {
      sections.push({
        id: "more",
        label: "Más",
        icon: MoreHorizontal,
        items: orphan,
      });
    }
  }

  return sections;
}

export function getHubNavSectionsForRole(
  role: UserRole,
  mode: BrandMode = "internal",
  layer: ProductLayer = "workspace",
): NavHubSection[] {
  const allowed = getNavItemsForRole(role, mode);
  if (mode === "client") {
    return [{ id: "inicio", label: "Portal", icon: LayoutDashboard, items: allowed }];
  }
  const blueprints = layer === "agency" ? AGENCY_HUB_BLUEPRINTS : WORKSPACE_HUB_BLUEPRINTS;
  return resolveHubSections(blueprints, allowed);
}

/** Primary mobile nav: one entry per hub (first item). */
export function getMobileHubNavItems(sections: NavHubSection[]): ProductNavItem[] {
  return sections
    .filter((s) => s.id !== "more")
    .map((s) => s.items[0])
    .filter(Boolean);
}

export function hubSectionIsActive(pathname: string, section: NavHubSection): boolean {
  return section.items.some((item) => isNavActive(pathname, item));
}

/** Icons for hub labels (documentation / CEO summaries). */
export const HUB_MODULE_COVERAGE: Record<NavHubId, string[]> = {
  inicio: ["Dashboard", "Launchpad", "Progreso activación"],
  clientes: ["CRM", "Conversaciones", "Helpdesk", "Calendario", "Live chat"],
  marketing: ["Ads", "Social", "Email/SMS", "Embudos", "Contenido web", "SEO", "Reputación"],
  ventas: ["Ecommerce", "Facturación", "Contratos", "Pipeline"],
  automation: ["Workflows", "IA Hub", "Modelo IA", "Chatbot"],
  growth: ["Growth Packs", "Plantillas élite", "Analytics ejecutivos", "OS ops"],
  agency: ["Panel agencia", "Clientes OS", "Packs"],
  saas: ["White-label", "Billing", "Afiliados", "Reportes CEO"],
  more: ["Settings", "Integraciones", "Storage", "Help"],
};
