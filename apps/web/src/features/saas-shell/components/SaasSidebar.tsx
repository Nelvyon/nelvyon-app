"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { LanguageSelector } from "@/components/LanguageSelector";
import { cn } from "@/core/ui/utils";
import { resetUser } from "@/lib/analytics";

import { SAAS_NAV_ITEMS, filterSaasNavForPermissions, isSaasNavActive, type SaasNavId } from "../saasNav";

function planTone(plan: "starter" | "pro" | "enterprise"): "primary" | "success" | "warning" {
  if (plan === "enterprise") return "warning";
  if (plan === "pro") return "success";
  return "primary";
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
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    void fetch("/api/saas/settings", { credentials: "same-origin" })
      .then(async (res) => (res.ok ? ((await res.json()) as { permissions?: string[] }) : null))
      .then((body) => setPermissions(body?.permissions ?? []))
      .catch(() => setPermissions([]));
  }, []);

  const visibleItems = useMemo(() => {
    if (permissions === null) return [...SAAS_NAV_ITEMS];
    return filterSaasNavForPermissions(permissions);
  }, [permissions]);

  return (
    <aside className="space-y-4" data-testid="saas-sidebar">
      <NelvyonDsCard className="space-y-4">
        <div className="text-lg font-semibold text-foreground">NELVYON</div>
        {showLanguageSelector ? <LanguageSelector /> : null}
        <nav className="space-y-1" aria-label="Navegación SaaS">
          {visibleItems.map((item) => {
            const active = isSaasNavActive(activeId, item.id);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {tenantCompany ? (
          <div className="space-y-1 border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">{tenantCompany}</p>
            <NelvyonDsBadge tone={planTone(tenantPlan)}>{tenantPlan}</NelvyonDsBadge>
          </div>
        ) : null}
        <NelvyonDsButton
          variant="secondary"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
            resetUser();
            router.replace("/auth/login");
          }}
        >
          Cerrar sesion
        </NelvyonDsButton>
      </NelvyonDsCard>
    </aside>
  );
}
