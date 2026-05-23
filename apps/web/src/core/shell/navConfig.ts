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
  Gift,
  GitMerge,
  GitBranch,
  Globe,
  GraduationCap,
  HardDrive,
  History,
  Inbox,
  Layout,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Phone,
  QrCode,
  Radio,
  Settings,
  Share2,
  ShoppingBag,
  Star,
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
  badgeKey?: "liveChat" | "helpdesk";
}

export const PRODUCT_NAV: readonly ProductNavItem[] = [
  { label: "Revenue", href: "/crm/clients", prefix: "/crm", module: "crm", icon: Users },
  { label: "CRM", href: "/dashboard/crm", prefix: "/dashboard/crm", module: "crm", icon: Users },
  { label: "Campañas", href: "/dashboard/campanas", prefix: "/dashboard/campanas", module: "campaigns", icon: Mail },
  { label: "SMS", href: "/dashboard/sms", prefix: "/dashboard/sms", module: "campaigns", icon: MessageSquare },
  { label: "Automatización", href: "/dashboard/automatizacion", prefix: "/dashboard/automatizacion", module: "automations", icon: Zap },
  { label: "Helpdesk", href: "/dashboard/helpdesk", prefix: "/dashboard/helpdesk", module: "inbox", icon: LifeBuoy, badgeKey: "helpdesk" },
  { label: "Inbox", href: "/inbox/tickets", prefix: "/inbox", module: "inbox", icon: Inbox },
  { label: "Campaigns", href: "/campaigns", prefix: "/campaigns", module: "campaigns", icon: Megaphone },
  {
    label: "Automations",
    href: "/automations/jobs",
    prefix: "/automations",
    module: "automations",
    icon: Workflow,
  },
  { label: "Contratos", href: "/dashboard/contratos", prefix: "/dashboard/contratos", module: "os", icon: FileText },
  { label: "Facturación", href: "/dashboard/facturacion", prefix: "/dashboard/facturacion", module: "billing", icon: CreditCard },
  { label: "Billing", href: "/billing", prefix: "/billing", module: "billing", icon: CreditCard },
  { label: "Calendario", href: "/dashboard/calendario", prefix: "/dashboard/calendario", module: "os", icon: Calendar },
  { label: "Reservas", href: "/dashboard/reservas", prefix: "/dashboard/reservas", module: "os", icon: Clock },
  { label: "SEO", href: "/dashboard/seo", prefix: "/dashboard/seo", module: "os", icon: TrendingUp },
  { label: "IA Hub", href: "/dashboard/ia", prefix: "/dashboard/ia", module: "os", icon: Cpu },
  { label: "Afiliados", href: "/dashboard/afiliados", prefix: "/dashboard/afiliados", module: "os", icon: Gift },
  { label: "Storage", href: "/dashboard/storage", prefix: "/dashboard/storage", module: "os", icon: HardDrive },
  { label: "Reportes", href: "/dashboard/reportes", prefix: "/dashboard/reportes", module: "os", icon: BarChart2 },
  { label: "Settings", href: "/dashboard/settings", prefix: "/dashboard/settings", module: "settings", icon: Settings },
  { label: "OS", href: "/os", prefix: "/os", module: "os", icon: Activity },
  { label: "Webs", href: "/dashboard/websites", prefix: "/dashboard/websites", module: "os", icon: Globe },
  { label: "Tiendas", href: "/dashboard/stores", prefix: "/dashboard/stores", module: "os", icon: ShoppingBag },
  { label: "Landing Pages", href: "/dashboard/landing-pages", prefix: "/dashboard/landing-pages", module: "os", icon: Layout },
  { label: "Funnels", href: "/dashboard/funnels", prefix: "/dashboard/funnels", module: "os", icon: GitMerge },
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
  { label: "Social", href: "/dashboard/social-scheduler", prefix: "/dashboard/social-scheduler", module: "os", icon: Share2 },
  { label: "Social Monitoring", href: "/dashboard/social-monitoring", prefix: "/dashboard/social-monitoring", module: "os", icon: Radio },
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
