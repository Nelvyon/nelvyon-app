"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";

import { BottomNav } from "@/components/dashboard/BottomNav";
import { AuthDebugPanel } from "@/core/auth/AuthDebugPanel";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { PRODUCT_LAYER_LABELS, useProductLayer, type ProductLayer } from "@/core/product/productLayer";
import {
  getHubNavSectionsForRole,
  getMobileHubNavItems,
  hubSectionIsActive,
  type NavHubSection,
} from "@/core/shell/hubNavConfig";
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
import { NELVYON_PLATFORM_UI_SEED } from "@/lib/template-library/platform-ui-seed";

const SIDEBAR_LS_KEY = "nelvyon.sidebarCollapsed";
const HUB_COLLAPSE_LS_KEY = "nelvyon.hubCollapse";

function ProductLayerSwitcher({
  layer,
  onChange,
  collapsed,
}: {
  layer: ProductLayer;
  onChange: (layer: ProductLayer) => void;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <button
        aria-label={PRODUCT_LAYER_LABELS[layer]}
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-border text-xs font-bold text-primary"
        onClick={() => onChange(layer === "agency" ? "workspace" : "agency")}
        title={PRODUCT_LAYER_LABELS[layer]}
        type="button"
      >
        {layer === "agency" ? "A" : "E"}
      </button>
    );
  }

  return (
    <div className="flex rounded-lg border border-border p-0.5 text-xs">
      {(["workspace", "agency"] as ProductLayer[]).map((l) => (
        <button
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 font-medium transition",
            layer === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          key={l}
          onClick={() => onChange(l)}
          type="button"
        >
          {l === "workspace" ? "Empresa" : "Agencia"}
        </button>
      ))}
    </div>
  );
}

function HubNavList({
  sections,
  pathname,
  collapsed,
  onNavigate,
  liveChatUnread = 0,
  helpdeskOpen = 0,
  omnichannelUnread = 0,
}: {
  sections: NavHubSection[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  liveChatUnread?: number;
  helpdeskOpen?: number;
  omnichannelUnread?: number;
}) {
  const tNav = useTranslations("sidebar");
  const [collapsedHubs, setCollapsedHubs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HUB_COLLAPSE_LS_KEY);
      if (raw) setCollapsedHubs(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleHub = (hubId: string) => {
    setCollapsedHubs((prev) => {
      const next = { ...prev, [hubId]: !prev[hubId] };
      try {
        window.localStorage.setItem(HUB_COLLAPSE_LS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const flatItems = collapsed ? getMobileHubNavItems(sections) : null;

  const renderItem = (item: ProductNavItem) => {
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
          "flex min-h-[40px] items-center rounded-md text-sm transition-colors",
          collapsed ? "justify-center px-2 py-2" : "gap-2 px-3 py-1.5",
          active ? "bg-primary text-primary-foreground" : "text-foreground/95 hover:bg-muted",
        )}
        href={item.href}
        key={item.href}
        onClick={onNavigate}
        title={label}
      >
        <span className="relative shrink-0">
          <Icon aria-hidden className="h-4 w-4 opacity-90" />
          {badge > 0 && collapsed ? (
            <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
              {badge > 9 ? "9+" : badge}
            </span>
          ) : null}
        </span>
        {!collapsed ? (
          <span className="flex flex-1 items-center justify-between gap-2 truncate">
            <span className="truncate">{label}</span>
            {badge > 0 ? (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </span>
        ) : null}
      </Link>
    );
  };

  if (collapsed && flatItems) {
    return (
      <nav aria-label="Product hubs" className="space-y-1 p-2">
        {flatItems.map((item) => renderItem(item))}
      </nav>
    );
  }

  return (
    <nav aria-label="Product hubs" className="space-y-2 p-3">
      {sections.map((section) => {
        const hubActive = hubSectionIsActive(pathname, section);
        const isHubCollapsed = collapsedHubs[section.id] && !hubActive;
        const HubIcon = section.icon;

        return (
          <div key={section.id}>
            <button
              aria-expanded={!isHubCollapsed}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide",
                hubActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => toggleHub(section.id)}
              type="button"
            >
              <HubIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{section.label}</span>
              <ChevronDown
                aria-hidden
                className={cn("h-3.5 w-3.5 transition", isHubCollapsed ? "-rotate-90" : "")}
              />
            </button>
            {!isHubCollapsed ? (
              <div className="mt-0.5 space-y-0.5 pl-1">{section.items.map((item) => renderItem(item))}</div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

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
  sections,
  flatItems,
  pathname,
  appName,
  logoUrl,
  isClientMode,
  productLayer,
  onProductLayerChange,
  liveChatUnread,
  helpdeskOpen,
  omnichannelUnread,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  sections: NavHubSection[];
  flatItems: ProductNavItem[];
  pathname: string;
  appName: string;
  logoUrl: string | null;
  isClientMode: boolean;
  productLayer: ProductLayer;
  onProductLayerChange: (layer: ProductLayer) => void;
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
            className={cn("font-semibold text-foreground tracking-tight", collapsed ? "text-center text-xs" : "text-base")}
            href="/dashboard"
          >
            {logoUrl && !collapsed ? (
               
              <img alt={appName} className="max-h-8 max-w-[140px] object-contain" src={logoUrl} />
            ) : logoUrl && collapsed ? (
               
              <img alt={appName} className="mx-auto h-8 w-8 object-contain" src={logoUrl} />
            ) : collapsed ? (
              <span className="text-[#66a3ff]">N</span>
            ) : (
              <span className="bg-gradient-to-r from-white to-[#66a3ff] bg-clip-text text-transparent">
                {appName.toUpperCase()}
              </span>
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
        {!collapsed ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {isClientMode ? "Client portal" : PRODUCT_LAYER_LABELS[productLayer]}
          </p>
        ) : null}
      </div>
      {!isClientMode ? (
        <div className={cn("border-b border-border", collapsed ? "p-2" : "px-3 py-2")}>
          <ProductLayerSwitcher
            collapsed={collapsed}
            layer={productLayer}
            onChange={onProductLayerChange}
          />
        </div>
      ) : null}
      {isClientMode ? (
        <NavList
          collapsed={collapsed}
          helpdeskOpen={helpdeskOpen}
          items={flatItems}
          liveChatUnread={liveChatUnread}
          omnichannelUnread={omnichannelUnread}
          onNavigate={onNavigate}
          pathname={pathname}
        />
      ) : (
        <HubNavList
          collapsed={collapsed}
          helpdeskOpen={helpdeskOpen}
          liveChatUnread={liveChatUnread}
          omnichannelUnread={omnichannelUnread}
          onNavigate={onNavigate}
          pathname={pathname}
          sections={sections}
        />
      )}
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

  const { layer: productLayer, setLayer: setProductLayer } = useProductLayer();

  const flatItems = user ? getNavItemsForRole(user.role, brandMode) : [];
  const hubSections = user
    ? getHubNavSectionsForRole(user.role, brandMode, isClientMode ? "workspace" : productLayer)
    : [];
  const mobileNavItems = isClientMode ? flatItems : getMobileHubNavItems(hubSections);

  return (
    <div
      className="nelvyon-enterprise-app flex min-h-screen flex-col bg-muted lg:flex-row"
      data-platform-ui-seed={NELVYON_PLATFORM_UI_SEED.seed_id}
    >
      <aside
        className={cn(
          "nelvyon-enterprise-sidebar hidden shrink-0 flex-col border-r transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[4.25rem]" : "w-56",
        )}
      >
        <SidebarChrome
          appName={appName}
          collapsed={collapsed}
          flatItems={flatItems}
          helpdeskOpen={helpdeskOpen}
          isClientMode={isClientMode}
          liveChatUnread={liveChatUnread}
          logoUrl={logoUrl}
          omnichannelUnread={omnichannelUnread}
          onProductLayerChange={setProductLayer}
          onToggleCollapsed={() => persistCollapsed(!collapsed)}
          pathname={pathname}
          productLayer={productLayer}
          sections={hubSections}
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
          <aside className="nelvyon-enterprise-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r shadow-elevated lg:hidden">
            <SidebarChrome
              appName={appName}
              collapsed={false}
              flatItems={flatItems}
              helpdeskOpen={helpdeskOpen}
              isClientMode={isClientMode}
              liveChatUnread={liveChatUnread}
              logoUrl={logoUrl}
              omnichannelUnread={omnichannelUnread}
              onNavigate={() => setMobileNavOpen(false)}
              onProductLayerChange={setProductLayer}
              onToggleCollapsed={() => setMobileNavOpen(false)}
              pathname={pathname}
              productLayer={productLayer}
              sections={hubSections}
            />
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="nelvyon-enterprise-topbar sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
              className="border-white/10 lg:hidden"
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
                      <span className="rounded-full border border-[#0084ff]/30 bg-[#0084ff]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0084ff]">
                        Enterprise
                      </span>
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
        <main className="nelvyon-enterprise-main min-h-0 flex-1 px-4 py-5 pb-20 md:px-6 lg:px-8 lg:pb-5">
          <div className="mx-auto max-w-6xl">
            <RoutePageHeader />
            {!isClientMode ? <HelpBotPanel /> : null}
            {pathname.startsWith("/dashboard") ? <PWAInstallButton /> : null}
            {children}
          </div>
        </main>
        <BottomNav items={mobileNavItems} />
        {pathname.startsWith("/dashboard") ? <VoiceCommand /> : null}
      </div>
    </div>
  );
}
