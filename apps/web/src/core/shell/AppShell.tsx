"use client";

import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";

import { BottomNav } from "@/components/dashboard/BottomNav";
import { AuthDebugPanel } from "@/core/auth/AuthDebugPanel";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { getNavItemsForRole, isNavActive, ProductNavItem } from "@/core/shell/navConfig";
import { useWhitelabel } from "@/core/whitelabel/WhitelabelProvider";
import { RoutePageHeader } from "@/core/shell/RoutePageHeader";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { livechatApi } from "@/features/builders/api";
import { omnichannelApi } from "@/features/omnichannel/api";
import { dashboardHelpdeskApi } from "@/features/dashboard/api";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { VoiceCommand } from "@/components/VoiceCommand";
import { HelpBotPanel } from "@/features/helpbot/components/HelpBotPanel";
import { ThemeToggle } from "@/core/theme/ThemeToggle";
import { useWorkspaceRoleSync } from "@/core/workspace/useWorkspaceRoleSync";
import { WorkspaceSelector } from "@/core/workspace/WorkspaceSelector";
import { DashboardLanguageSelector } from "@/components/DashboardLanguageSelector";
import { navLabelKey } from "@/core/i18n/navKeys";

const SIDEBAR_LS_KEY = "nelvyon.sidebarCollapsed";

function NavList({
  items,
  pathname,
  collapsed,
  onNavigate,
  liveChatUnread = 0,
  helpdeskOpen = 0,
  omnichannelUnread = 0,
}: {
  items: ProductNavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  liveChatUnread?: number;
  helpdeskOpen?: number;
  omnichannelUnread?: number;
}) {
  const tNav = useTranslations("sidebar");
  return (
    <nav aria-label="Product" className={cn("space-y-1", collapsed ? "p-2" : "p-3")}>
      {items.map((item) => {
        const active = isNavActive(pathname, item);
        const Icon = item.icon;
        const key = navLabelKey(item.href);
        const translated = key ? tNav(key) : item.label;
        const label = key && translated.startsWith("sidebar.") ? item.label : translated;
        const badge =
          item.badgeKey === "liveChat" && liveChatUnread > 0
            ? liveChatUnread
            : item.badgeKey === "helpdesk" && helpdeskOpen > 0
              ? helpdeskOpen
              : item.badgeKey === "omnichannel" && omnichannelUnread > 0
                ? omnichannelUnread
                : 0;
        return (
          <Link
            aria-label={label}
            className={cn(
              "flex min-h-[44px] items-center rounded-md text-sm transition-colors",
              collapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2",
              active ? "bg-primary text-primary-foreground" : "text-foreground/95 hover:bg-muted",
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            title={label}
          >
            <span className="relative shrink-0">
              <Icon aria-hidden className="h-5 w-5 opacity-90" />
              {badge > 0 && collapsed ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : null}
            </span>
            {!collapsed ? (
              <span className="flex flex-1 items-center justify-between gap-2">
                <span>{label}</span>
                {badge > 0 ? (
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </span>
            ) : null}
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
  logoUrl,
  isClientMode,
  liveChatUnread,
  helpdeskOpen,
  omnichannelUnread,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  items: ProductNavItem[];
  pathname: string;
  appName: string;
  logoUrl: string | null;
  isClientMode: boolean;
  liveChatUnread: number;
  helpdeskOpen: number;
  omnichannelUnread: number;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className={cn("border-b border-border", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "justify-between gap-2")}>
          <Link
            className={cn("font-semibold text-foreground", collapsed ? "text-center text-xs" : "text-base")}
            href="/"
          >
            {logoUrl && !collapsed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={appName} className="max-h-8 max-w-[140px] object-contain" src={logoUrl} />
            ) : logoUrl && collapsed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={appName} className="mx-auto h-8 w-8 object-contain" src={logoUrl} />
            ) : collapsed ? (
              appName.charAt(0).toUpperCase()
            ) : (
              appName
            )}
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
      <NavList
        collapsed={collapsed}
        helpdeskOpen={helpdeskOpen}
        items={items}
        liveChatUnread={liveChatUnread}
        omnichannelUnread={omnichannelUnread}
        onNavigate={onNavigate}
        pathname={pathname}
      />
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
  const { appName, logoUrl } = useWhitelabel();
  useWorkspaceRoleSync();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [liveChatUnread, setLiveChatUnread] = useState(0);
  const [helpdeskOpen, setHelpdeskOpen] = useState(0);
  const [omnichannelUnread, setOmnichannelUnread] = useState(0);

  useEffect(() => {
    if (!user || isClientMode) return;
    const load = () => {
      livechatApi
        .stats()
        .then((s) => setLiveChatUnread(s.unread ?? 0))
        .catch(() => undefined);
      dashboardHelpdeskApi
        .stats()
        .then((s) => setHelpdeskOpen(Number(s.open_count ?? 0)))
        .catch(() => undefined);
      omnichannelApi
        .stats()
        .then((s) => setOmnichannelUnread(Number(s.unread_count ?? 0)))
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user, isClientMode]);

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
          helpdeskOpen={helpdeskOpen}
          isClientMode={isClientMode}
          items={items}
          liveChatUnread={liveChatUnread}
          logoUrl={logoUrl}
          omnichannelUnread={omnichannelUnread}
          onToggleCollapsed={() => persistCollapsed(!collapsed)}
          pathname={pathname}
        />
      </aside>

      {mobileNavOpen ? (
        <>
          <button
            aria-label="Cerrar menú"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            type="button"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card shadow-elevated lg:hidden">
            <SidebarChrome
              appName={appName}
              collapsed={false}
              helpdeskOpen={helpdeskOpen}
              isClientMode={isClientMode}
              items={items}
              liveChatUnread={liveChatUnread}
              logoUrl={logoUrl}
              omnichannelUnread={omnichannelUnread}
              onNavigate={() => setMobileNavOpen(false)}
              onToggleCollapsed={() => setMobileNavOpen(false)}
              pathname={pathname}
            />
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-2 backdrop-blur-sm md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
              className="lg:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              size="sm"
              type="button"
              variant="outline"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
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
            <DashboardLanguageSelector />
            <ThemeToggle />
            {!isClientMode ? <WorkspaceSelector /> : null}
            {!isClientMode ? <AuthDebugPanel /> : null}
          </div>
        </header>
        <main className="min-h-0 flex-1 px-4 py-5 pb-20 md:px-6 lg:px-8 lg:pb-5">
          <div className="mx-auto max-w-6xl">
            <RoutePageHeader />
            {!isClientMode ? <HelpBotPanel /> : null}
            {pathname.startsWith("/dashboard") ? <PWAInstallButton /> : null}
            {children}
          </div>
        </main>
        <BottomNav items={items} />
        {pathname.startsWith("/dashboard") ? <VoiceCommand /> : null}
      </div>
    </div>
  );
}
