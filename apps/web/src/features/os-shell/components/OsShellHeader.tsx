"use client";

import Link from "next/link";
import { Menu, RefreshCw } from "lucide-react";

import { ThemeToggle } from "@/core/theme/ThemeToggle";
import { WorkspaceSelector } from "@/core/workspace/WorkspaceSelector";
import { OS_SHELL_QUICK_LINKS } from "@/features/os-shell/osShellNav";
import { OsShellBreadcrumbs } from "@/features/os-shell/components/OsShellBreadcrumbs";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";

export function OsShellHeader({
  onToggleSidebar,
  onRefresh,
  refreshing,
}: {
  onToggleSidebar?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#020817]/95 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {onToggleSidebar ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-white hover:bg-white/10 md:hidden"
                onClick={onToggleSidebar}
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : null}
            <OsShellBreadcrumbs />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WorkspaceSelector />
            {onRefresh ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("mr-1.5 h-4 w-4", refreshing && "animate-spin")} />
                Actualizar
              </Button>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {OS_SHELL_QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition-colors hover:border-[#0084FF]/40 hover:text-white"
              >
                <Icon className="h-3.5 w-3.5 text-[#0084FF]" aria-hidden />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
