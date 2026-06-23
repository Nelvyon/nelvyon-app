"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge } from "@/design-system/components";
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
  principal: { label: "Principal", icon: "⬡" },
  comunicacion: { label: "Comunicación", icon: "◈" },
  captacion: { label: "Captación", icon: "◎" },
  gestion: { label: "Gestión", icon: "⊞" },
  ia: { label: "IA", icon: "✦" },
  cuenta: { label: "Cuenta", icon: "◯" },
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
  const cfg = GROUP_CONFIG[groupId] ?? { label: groupId, icon: "·" };

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30 hover:text-white/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[#0084ff]/60">{cfg.icon}</span>
          <span>{cfg.label}</span>
        </span>
        <span className="text-white/20">{open ? "▾" : "▸"}</span>
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
                  "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                  active
                    ? "bg-[#0084ff]/10 text-[#0084ff] font-medium shadow-[inset_0_0_0_1px_rgba(0,132,255,0.2)]"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#0084ff] shadow-[0_0_6px_#0084ff]" />
                )}
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
  const plan = (tenant?.plan ?? tenantPlan) as "starter" | "pro" | "enterprise";

  const visibleItems = loading
    ? [...SAAS_NAV_ITEMS]
    : filterSaasNavForPermissions(permissions);

  const grouped = visibleItems.reduce<Record<string, SaasNavItem[]>>((acc, item) => {
    const g = (item as SaasNavItem & { group?: string }).group ?? "principal";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const groupOrder = ["principal", "comunicacion", "captacion", "gestion", "ia", "cuenta"];

  return (
    <aside data-testid="saas-sidebar" className="sticky top-6 self-start">
      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0b1428]/90 backdrop-blur-xl shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        {/* Top shimmer line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#0084ff]/40 to-transparent" />

        <div className="space-y-4 px-3 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0084ff] to-[#0047ab] shadow-[0_0_12px_rgba(0,132,255,0.5)]">
              <span className="text-xs font-black text-white">N</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-white">NELVYON</span>
            <span className="ml-auto text-[10px] font-semibold text-[#0084ff]/70 tracking-widest uppercase">SaaS</span>
          </div>

          {showLanguageSelector && (
            <div className="[&_select]:bg-white/5 [&_select]:border-white/10 [&_select]:text-white/70">
              <LanguageSelector />
            </div>
          )}

          {/* Navigation */}
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
            <div className="space-y-2 border-t border-white/[0.06] pt-3 px-1">
              <p className="truncate text-xs font-medium text-white/80">{company}</p>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  plan === "enterprise" ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25" :
                  plan === "pro" ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25" :
                  "bg-[#0084ff]/15 text-[#0084ff] ring-1 ring-[#0084ff]/25"
                )}>
                  {plan}
                </span>
              </div>
            </div>
          ) : null}

          {/* Logout */}
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
              resetUser();
              router.replace("/auth/login");
            }}
            className="w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm text-white/50 transition-all hover:bg-white/[0.07] hover:text-white/80"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
