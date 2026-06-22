"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { LanguageSelector } from "@/components/LanguageSelector";
import { cn } from "@/core/ui/utils";
import { resetUser } from "@/lib/analytics";

import { SAAS_NAV_ITEMS, filterSaasNavForPermissions, isSaasNavActive, type SaasNavId, type SaasNavItem } from "../saasNav";
import { useSaasPermissions } from "../useSaasPermissions";

function planTone(plan: "starter" | "pro" | "enterprise"): "primary" | "success" | "warning" {
  if (plan === "enterprise") return "warning";
  if (plan === "pro") return "success";
  return "primary";
}

const GROUP_CONFIG: Record<string, { label: string; icon: string }> = {
  principal: { label: "Principal", icon: "🏠" },
  comunicacion: { label: "Comunicación", icon: "📨" },
  captacion: { label: "Captación", icon: "🎯" },
  gestion: { label: "Gestión", icon: "⚙️" },
  ia: { label: "Inteligencia IA", icon: "⚡" },
  cuenta: { label: "Cuenta", icon: "👤" },
};

function NavGroup({
  groupId,
  items,
  activeId,
  defaultOpen = true,
}: {
  groupId: string;
  items: SaasNavItem[];
  activeId: SaasNavId;
  defaultOpen?: boolean;
}) {
  const hasActive = items.some(i => isSaasNavActive(activeId, i.id));
  const [open, setOpen] = useState(defaultOpen || hasActive);
  const cfg = GROUP_CONFIG[groupId] ?? { label: groupId, icon: "•" };

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
        </span>
        <span className="text-muted-foreground/40">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((item) => {
            const active = isSaasNavActive(activeId, item.id);
            return (
              <Link
                key={`${item.id}-${item.href}`}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SaasSidebar({
  activeId,
  tenantCompany,
  tenantPlan = "starter",
  showLanguageSelector = false,
}: {
  activeId: SaasNavId;
  tenantCompany?: string;
  tenantPlan?: "starter" | "pro" | "enterprise";
  showLanguageSelector?: boolean;
}) {
  const router = useRouter();
  const { permissions, loading, tenant } = useSaasPermissions();

  const company = tenantCompany ?? tenant?.companyName;
  const plan = tenant?.plan ?? tenantPlan;

  const visibleItems = loading
    ? [...SAAS_NAV_ITEMS]
    : filterSaasNavForPermissions(permissions);

  // Group items
  const grouped = visibleItems.reduce<Record<string, SaasNavItem[]>>((acc, item) => {
    const g = (item as SaasNavItem & { group?: string }).group ?? "principal";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const groupOrder = ["principal", "comunicacion", "captacion", "gestion", "ia", "cuenta"];

  return (
    <aside className="space-y-4" data-testid="saas-sidebar">
      <NelvyonDsCard className="space-y-4 px-3 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">N</div>
          <span className="text-base font-bold tracking-tight text-foreground">NELVYON</span>
        </div>

        {showLanguageSelector ? <LanguageSelector /> : null}

        {/* Grouped nav */}
        <nav className="space-y-3" aria-label="Navegación SaaS">
          {groupOrder.map((gId) => {
            const items = grouped[gId];
            if (!items?.length) return null;
            return (
              <NavGroup
                key={gId}
                groupId={gId}
                items={items}
                activeId={activeId}
                defaultOpen={gId === "principal" || gId === "ia" || items.some(i => isSaasNavActive(activeId, i.id))}
              />
            );
          })}
        </nav>

        {/* Tenant info */}
        {company ? (
          <div className="space-y-1.5 border-t border-border pt-3 px-1">
            <p className="text-xs font-medium text-foreground truncate">{company}</p>
            <NelvyonDsBadge tone={planTone(plan)} size="sm">{plan}</NelvyonDsBadge>
          </div>
        ) : null}

        <NelvyonDsButton
          variant="secondary"
          size="sm"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
            resetUser();
            router.replace("/auth/login");
          }}
          className="w-full"
        >
          Cerrar sesión
        </NelvyonDsButton>
      </NelvyonDsCard>
    </aside>
  );
}
