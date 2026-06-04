"use client";

import { ReactNode, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { OsShellHeader } from "@/features/os-shell/components/OsShellHeader";
import { OsShellSidebar } from "@/features/os-shell/components/OsShellSidebar";
import { cn } from "@/core/ui/utils";

export function OsShellLayout({
  children,
  onRefresh,
  refreshing,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ProtectedLayout module="os">
      <div className="nelvyon-os-shell dark min-h-screen bg-[#020817] text-white">
        <div className="flex min-h-screen">
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-30 md:static md:translate-x-0",
              mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            )}
          >
            <OsShellSidebar collapsed={collapsed} />
          </div>
          {mobileOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-20 bg-black/60 md:hidden"
              aria-label="Cerrar menú"
              onClick={() => setMobileOpen(false)}
            />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <OsShellHeader
              onToggleSidebar={() => setMobileOpen((v) => !v)}
              onRefresh={onRefresh}
              refreshing={refreshing}
            />
            <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
          </div>
        </div>
        <button
          type="button"
          className="fixed bottom-4 left-4 z-10 hidden rounded-full border border-white/10 bg-[#07122a] px-3 py-1 text-xs text-white/60 hover:text-white md:block"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? "Expandir" : "Colapsar"}
        </button>
      </div>
    </ProtectedLayout>
  );
}
