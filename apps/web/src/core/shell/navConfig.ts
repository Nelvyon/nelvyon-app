import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart2,
  Bot,
  ClipboardList,
  Calendar,
  CircleHelp,
  Clock,
  Cpu,
  CreditCard,
  Database,
  FileText,
  FileBarChart,
  Gift,
  GitMerge,
  GitBranch,
  Globe,
  GraduationCap,
  HardDrive,
  History,
  Inbox,
  Layout,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Megaphone,
  Palette,
  MessageCircle,
  MessageSquare,
  Phone,
  QrCode,
  Radio,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Key,
  TrendingUp,
  Users,
  Video,
  Workflow,
  Zap,
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
  badgeKey?: "liveChat" | "helpdesk" | "omnichannel";
}

export const PRODUCT_NAV: readonly ProductNavItem[] = [
  { label: "Inicio", href: "/dashboard", prefix: "/dashboard", module: "os", icon: LayoutDashboard },
  { label: "Revenue", href: "/crm", prefix: "/crm", module: "crm", icon: Users },
  { label: "Publicidad", href: "/publicidad", prefix: "/publicidad", module: "ads", icon: Megaphone },
  { label: "Social", href: "/social", prefix: "/social", module: "social", icon: Share2 },
  { label: "Embudos", href: "/funnels", prefix: "/funnels", module: "funnels", icon: GitMerge },
  { label: "Ecommerce", href: "/ecommerce", prefix: "/ecommerce", module: "ecommerce", icon: ShoppingBag },
  { label: "Campañas", href: "/campaigns", prefix: "/campaigns", module: "campaigns", icon: Megaphone },
  { label: "SMS", href: "/dashboard/sms", prefix: "/dashboard/sms", module: "campaigns", icon: MessageSquare },
  { label: "Bandeja", href: "/dashboard/inbox", prefix: "/dashboard/inbox", module: "inbox", icon: Inbox, badgeKey: "omnichannel" },
  { label: "Helpdesk", href: "/inbox/tickets", prefix: "/inbox", module: "inbox", icon: LifeBuoy, badgeKey: "helpdesk" },
  { label: "Workflows", href: "/dashboard/workflows", prefix: "/dashboard/workflows", module: "automations", icon: GitBranch },
  { label: "Automatización", href: "/automations/jobs", prefix: "/automations", module: "automations", icon: Workflow },
  { label: "Contratos", href: "/dashboard/contratos", prefix: "/dashboard/contratos", module: "os", icon: FileText },
  { label: "Facturación", href: "/billing", prefix: "/billing", module: "billing", icon: CreditCard },
  { label: "Calendario", href: "/dashboard/calendario", prefix: "/dashboard/calendario", module: "os", icon: Calendar },
  { label: "Reservas", href: "/dashboard/reservas", prefix: "/dashboard/reservas", module: "os", icon: Clock },
  { label: "SEO", href: "/dashboard/seo", prefix: "/dashboard/seo", module: "os", icon: TrendingUp },
  { label: "IA Hub", href: "/dashboard/ia", prefix: "/dashboard/ia", module: "os", icon: Cpu },
  { label: "Mi Modelo IA", href: "/dashboard/ai-model", prefix: "/dashboard/ai-model", module: "os", icon: Sparkles },
  { label: "Afiliados", href: "/dashboard/afiliados", prefix: "/dashboard/afiliados", module: "os", icon: Gift },
  { label: "Storage", href: "/dashboard/storage", prefix: "/dashboard/storage", module: "os", icon: HardDrive },
  { label: "Reportes", href: "/dashboard/reportes", prefix: "/dashboard/reportes", module: "os", icon: BarChart2 },
  {
    label: "Analytics",
    href: "/dashboard/analytics/benchmarks",
    prefix: "/dashboard/analytics",
    module: "os",
    icon: TrendingUp,
  },
  {
    label: "Reportes Ejecutivos",
    href: "/dashboard/executive-reports",
    prefix: "/dashboard/executive-reports",
    module: "os",
    icon: FileBarChart,
  },
  { label: "Settings", href: "/dashboard/settings", prefix: "/dashboard/settings", module: "settings", icon: Settings },
  { label: "White-label", href: "/dashboard/white-label", prefix: "/dashboard/white-label", module: "settings", icon: Palette },
  { label: "API & Webhooks", href: "/dashboard/api-keys", prefix: "/dashboard/api-keys", module: "settings", icon: Key },
  { label: "OS", href: "/os/dashboard", prefix: "/os", module: "os", icon: Activity },
  { label: "Webs", href: "/dashboard/websites", prefix: "/dashboard/websites", module: "os", icon: Globe },
  { label: "Landing Pages", href: "/dashboard/landing-pages", prefix: "/dashboard/landing-pages", module: "os", icon: Layout },
  { label: "Live Chat", href: "/dashboard/live-chat", prefix: "/dashboard/live-chat", module: "os", icon: MessageCircle, badgeKey: "liveChat" },
  { label: "Chatbot", href: "/dashboard/chatbot", prefix: "/dashboard/chatbot", module: "os", icon: Bot },
  { label: "Cursos", href: "/dashboard/cursos", prefix: "/dashboard/cursos", module: "os", icon: GraduationCap },
  { label: "A/B Testing", href: "/dashboard/ab-testing", prefix: "/dashboard/ab-testing", module: "os", icon: GitBranch },
  { label: "Loyalty", href: "/dashboard/loyalty", prefix: "/dashboard/loyalty", module: "os", icon: Star },
  { label: "Webinars", href: "/dashboard/webinars", prefix: "/dashboard/webinars", module: "os", icon: Video },
  { label: "CDP", href: "/dashboard/cdp", prefix: "/dashboard/cdp", module: "os", icon: Database },
  { label: "Dialer", href: "/dashboard/dialer", prefix: "/dashboard/dialer", module: "os", icon: Phone },
  { label: "QR Codes", href: "/dashboard/qr", prefix: "/dashboard/qr", module: "os", icon: QrCode },
  { label: "Formularios", href: "/dashboard/formularios", prefix: "/dashboard/formularios", module: "os", icon: ClipboardList },
  { label: "Historial", href: "/dashboard/history", prefix: "/dashboard", module: "os", icon: History },
  { label: "Help", href: "/help", prefix: "/help", module: "help", icon: CircleHelp },
] as const;

const CLIENT_PORTAL_NAV: readonly ProductNavItem[] = [
  { label: "Inicio", href: "/portal", prefix: "/portal-home", module: "campaigns", icon: Layout },
  { label: "Proyectos", href: "/portal/projects", prefix: "/portal/projects", module: "campaigns", icon: Megaphone },
  {
    label: "Entregables",
    href: "/portal/deliverables",
    prefix: "/portal/deliverables",
    module: "campaigns",
    icon: FileText,
  },
];

function labelForMode(item: ProductNavItem, mode: BrandMode): string {
  if (mode === "internal") return item.label;
  if (item.module === "inbox") return "Requests";
  if (item.module === "campaigns") return "Projects";
  if (item.module === "billing") return "Billing";
  if (item.module === "help") return "Support";
  return item.label;
}

export function getNavItemsForRole(role: UserRole, mode: BrandMode = "internal"): ProductNavItem[] {
  if (mode === "client") {
    const supportNav = PRODUCT_NAV.filter(
      (item) => isModuleAllowed(item.module, mode) && item.module !== "campaigns",
    ).map((item) => ({ ...item, label: labelForMode(item, mode) }));
    return [...CLIENT_PORTAL_NAV, ...supportNav];
  }

  return PRODUCT_NAV.filter(
    (item) => can(role, item.module, "view") && isModuleAllowed(item.module, mode),
  ).map((item) => ({ ...item, label: labelForMode(item, mode) }));
}

export function isNavActive(pathname: string, item: ProductNavItem) {
  if (pathname === item.href) return true;
  return pathname.startsWith(`${item.prefix}/`) || pathname === item.prefix;
}
