import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Briefcase,
  Brain,
  CircleDollarSign,
  ClipboardList,
  FileStack,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  PackageCheck,
  Settings,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

export interface OsShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Rutas hijas activan el ítem */
  matchPrefix?: string;
}

/** Navegación principal del shell OS (operación interna NELVYON). */
export const OS_SHELL_NAV: readonly OsShellNavItem[] = [
  { label: "Dashboard", href: "/os/dashboard", icon: LayoutDashboard, matchPrefix: "/os/dashboard" },
  { label: "Clientes", href: "/os/clientes", icon: Users, matchPrefix: "/os/clientes" },
  { label: "Proyectos", href: "/os/proyectos", icon: FolderKanban, matchPrefix: "/os/proyectos" },
  { label: "Pipeline", href: "/os/pipeline", icon: GitBranch, matchPrefix: "/os/pipeline" },
  { label: "Tareas", href: "/os/tareas", icon: ClipboardList, matchPrefix: "/os/tareas" },
  { label: "Entregables", href: "/os/entregables", icon: PackageCheck, matchPrefix: "/os/entregables" },
  { label: "Documentos", href: "/os/documentos", icon: FileStack, matchPrefix: "/os/documentos" },
  { label: "Finanzas", href: "/os/finanzas", icon: CircleDollarSign, matchPrefix: "/os/finanzas" },
  { label: "IA", href: "/os/ia", icon: Sparkles, matchPrefix: "/os/ia" },
  { label: "Configuración", href: "/os/configuracion", icon: Settings, matchPrefix: "/os/configuracion" },
] as const;

export const OS_SHELL_QUICK_LINKS: readonly OsShellNavItem[] = [
  { label: "Hub operaciones", href: "/os", icon: Workflow },
  { label: "Agentes", href: "/os/agents", icon: Bot },
  { label: "Learning", href: "/os/autonomous/learning", icon: Brain },
  { label: "Ejecución", href: "/os/execution", icon: Briefcase },
] as const;

const BREADCRUMB_LABELS: Record<string, string> = {
  os: "NELVYON OS",
  dashboard: "Dashboard",
  clientes: "Clientes",
  proyectos: "Proyectos",
  pipeline: "Pipeline",
  tareas: "Tareas",
  entregables: "Entregables",
  documentos: "Documentos",
  finanzas: "Finanzas",
  ia: "IA",
  configuracion: "Configuración",
};

export function osShellBreadcrumbs(pathname: string): { href: string; label: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length || segments[0] !== "os") {
    return [{ href: "/os/dashboard", label: "NELVYON OS" }];
  }
  const crumbs: { href: string; label: string }[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = BREADCRUMB_LABELS[seg] ?? seg.replace(/-/g, " ");
    crumbs.push({ href: acc, label });
  }
  return crumbs;
}

export function isOsShellNavActive(pathname: string, item: OsShellNavItem): boolean {
  const prefix = item.matchPrefix ?? item.href;
  return pathname === item.href || pathname.startsWith(`${prefix}/`);
}
