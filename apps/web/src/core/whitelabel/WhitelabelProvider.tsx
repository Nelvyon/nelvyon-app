"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { whitelabelApi } from "@/features/whitelabel/api";
import type { WhitelabelApplyConfig } from "@/core/whitelabel/types";

type WhitelabelContextValue = {
  config: WhitelabelApplyConfig | null;
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  hideNelvyon: boolean;
  refresh: () => Promise<void>;
  setPreview: (cfg: WhitelabelApplyConfig | null) => void;
};

const WhitelabelContext = createContext<WhitelabelContextValue | null>(null);

function applyCssVariables(cfg: WhitelabelApplyConfig | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = cfg?.css_variables ?? {};
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  if (cfg?.primary_color) {
    root.style.setProperty("--primary", cfg.primary_color);
    root.style.setProperty("--color-primary", cfg.primary_color);
  }
  if (cfg?.secondary_color) {
    root.style.setProperty("--secondary", cfg.secondary_color);
  }
  if (cfg?.font) {
    root.style.setProperty("--font-family", `"${cfg.font}", system-ui, sans-serif`);
  }
}

function applyFavicon(url: string | null | undefined) {
  if (typeof document === "undefined" || !url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

function applyCustomCss(css: string | undefined) {
  if (typeof document === "undefined") return;
  const id = "nelvyon-whitelabel-css";
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!css?.trim()) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function WhitelabelProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: WhitelabelApplyConfig | null;
}) {
  const { workspaceId } = useWorkspace();
  const [hostConfig] = useState<WhitelabelApplyConfig | null>(initial ?? null);
  const [workspaceConfig, setWorkspaceConfig] = useState<WhitelabelApplyConfig | null>(null);
  const [previewConfig, setPreviewConfig] = useState<WhitelabelApplyConfig | null>(null);

  const refresh = useCallback(async () => {
    if (hostConfig) return;
    try {
      const applied = await whitelabelApi.apply();
      setWorkspaceConfig(applied);
    } catch {
      setWorkspaceConfig(null);
    }
  }, [hostConfig]);

  useEffect(() => {
    if (hostConfig) return;
    refresh().catch(() => undefined);
  }, [hostConfig, workspaceId, refresh]);

  const config = previewConfig ?? hostConfig ?? workspaceConfig;

  useEffect(() => {
    applyCssVariables(config);
    applyFavicon(config?.favicon_url);
    applyCustomCss(config?.custom_css);
  }, [config]);

  const value = useMemo<WhitelabelContextValue>(() => {
    const hideNelvyon = Boolean(config?.hide_nelvyon_branding || hostConfig);
    const appName = config?.company_name || config?.brand_name || (hideNelvyon ? "Portal" : "NELVYON");
    return {
      config,
      appName,
      logoUrl: config?.logo_url ?? null,
      faviconUrl: config?.favicon_url ?? null,
      hideNelvyon,
      refresh,
      setPreview: setPreviewConfig,
    };
  }, [config, hostConfig, refresh]);

  return <WhitelabelContext.Provider value={value}>{children}</WhitelabelContext.Provider>;
}

export function useWhitelabel(): WhitelabelContextValue {
  const ctx = useContext(WhitelabelContext);
  if (!ctx) {
    return {
      config: null,
      appName: "NELVYON",
      logoUrl: null,
      faviconUrl: null,
      hideNelvyon: false,
      refresh: async () => {},
      setPreview: () => {},
    };
  }
  return ctx;
}
