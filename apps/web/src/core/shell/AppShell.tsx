"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";

import { BottomNav } from "@/components/dashboard/BottomNav";
import { AuthDebugPanel } from "@/core/auth/AuthDebugPanel";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { getNavItemsForRole, isNavActive, ProductNavItem } from "@/core/shell/navConfig";
import { RoutePageHeader } from "@/core/shell/RoutePageHeader";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { HelpBotPanel } from "@/features/helpbot/components/HelpBotPanel";
import { ThemeToggle } from "@/core/theme/ThemeToggle";
import { useWorkspaceRoleSync } from "@/core/workspace/useWorkspaceRoleSync";
import { WorkspaceSelector } from "@/core/workspace/WorkspaceSelector";

const SIDEBAR_LS_KEY = "nelvyon.sidebarCollapsed";

function NavList({
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  items: ProductNavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Product" className={cn("space-y-1", collapsed ? "p-2" : "p-3")}>
      {items.map((item) => {
        const active = isNavActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            aria-label={item.label}
            className={cn(
              "flex min-h-[44px] items-center rounded-md text-sm transition-colors",
              collapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2",
              active ? "bg-primary text-primary-foreground" : "text-foreground/95 hover:bg-muted",
            )}
            href={item.href}
            key={item.module}
            onClick={onNavigate}
            title={item.label}
          >
            <Icon aria-hidden className="h-5 w-5 shrink-0 opacity-90" />
            {!collapsed ? <span>{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarChrome({
  collapsed,
  onToggleCollapsed,
  items,
  pathname,
  appName,
  isClientMode,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  items: ProductNavItem[];
  pathname: string;
  appName: string;
  isClientMode: boolean;
}) {
  return (
    <>
      <div className={cn("border-b border-border", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "justify-between gap-2")}>
          <Link
            className={cn("font-semibold text-foreground", collapsed ? "text-center text-xs" : "text-base")}
            href="/"
          >
            {collapsed ? appName.charAt(0).toUpperCase() : appName}
          </Link>
          <Button
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden shrink-0 lg:inline-flex"
            onClick={onToggleCollapsed}
            size="sm"
            type="button"
            variant="outline"
          >
            {collapsed ? <ChevronRight aria-hidden className="h-4 w-4" /> : <ChevronLeft aria-hidden className="h-4 w-4" />}
          </Button>
        </div>
        {!collapsed ? <p className="mt-1 text-xs text-muted-foreground">{isClientMode ? "Client portal" : "Workspace app"}</p> : null}
      </div>
      <NavList collapsed={collapsed} items={items} pathname={pathname} />
      {!collapsed && !isClientMode ? (
        <p className="px-3 pb-3 text-xs text-muted-foreground">
          Missing a module? Ask a workspace admin to update your role access.
        </p>
      ) : null}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { user } = useAuth();
  const brandMode = getBrandMode();
  const isClientMode = brandMode === "client";
  const appName = getBrandAppName(brandMode);
  useWorkspaceRoleSync();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_LS_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const persistCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_LS_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const items = user ? getNavItemsForRole(user.role, brandMode) : [];

  return (
    <div className="flex min-h-screen flex-col bg-muted lg:flex-row">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[4.25rem]" : "w-56",
        )}
      >
        <SidebarChrome
          appName={appName}
          collapsed={collapsed}
          items={items}
          isClientMode={isClientMode}
          onToggleCollapsed={() => persistCollapsed(!collapsed)}
          pathname={pathname}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-2 backdrop-blur-sm md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm text-muted-foreground">
              {user ? (
                <>
                  <span className="font-medium text-foreground">{user.email}</span>
                  {!isClientMode ? (
                    <>
                      <span className="text-muted-foreground/70"> · </span>
                      {user.role}
                    </>
                  ) : null}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <ThemeToggle />
            {!isClientMode ? <WorkspaceSelector /> : null}
            {!isClientMode ? <AuthDebugPanel /> : null}
          </div>
        </header>
        <main className="min-h-0 flex-1 px-4 py-5 pb-20 md:px-6 lg:px-8 lg:pb-5">
          <div className="mx-auto max-w-6xl">
            <RoutePageHeader />
            {!isClientMode ? <HelpBotPanel /> : null}
            {children}
          </div>
        </main>
        <BottomNav items={items} />
      </div>
    </div>
  );
}
