"use client";

import { useEffect, useState } from "react";

import type { SaasAction, SaasRole } from "./saasPermissions";
import { hasSaasPermission, saasForbiddenMessage } from "./saasPermissions";

export type SaasPermissionsSnapshot = {
  role: SaasRole;
  permissions: SaasAction[];
  tenant?: {
    companyName: string;
    plan: "starter" | "pro" | "enterprise";
  };
};

type CacheEntry = {
  data: SaasPermissionsSnapshot | null;
  error: string | null;
  listeners: Set<() => void>;
  inflight: Promise<void> | null;
};

const cache: CacheEntry = {
  data: null,
  error: null,
  listeners: new Set(),
  inflight: null,
};

function notifyListeners() {
  for (const fn of cache.listeners) fn();
}

async function fetchPermissions(): Promise<void> {
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    try {
      const res = await fetch("/api/saas/settings", { credentials: "same-origin" });
      if (!res.ok) {
        cache.error = res.status === 403 ? "Acceso denegado" : "No se pudieron cargar permisos";
        cache.data = null;
        return;
      }
      const body = (await res.json()) as {
        role: SaasRole;
        permissions: SaasAction[];
        tenant?: { companyName: string; plan: "starter" | "pro" | "enterprise" };
      };
      cache.data = {
        role: body.role,
        permissions: body.permissions ?? [],
        tenant: body.tenant
          ? { companyName: body.tenant.companyName, plan: body.tenant.plan }
          : undefined,
      };
      cache.error = null;
    } catch {
      cache.error = "No se pudieron cargar permisos";
      cache.data = null;
    } finally {
      cache.inflight = null;
      notifyListeners();
    }
  })();

  return cache.inflight;
}

/** Shared tenant permissions (single fetch per session). */
export function useSaasPermissions() {
  const [, tick] = useState(0);

  useEffect(() => {
    const listener = () => tick((n) => n + 1);
    cache.listeners.add(listener);
    void fetchPermissions();
    return () => {
      cache.listeners.delete(listener);
    };
  }, []);

  const can = (action: SaasAction): boolean => {
    if (!cache.data) return false;
    return hasSaasPermission(cache.data.permissions, action);
  };

  const forbidden = (action: SaasAction) => saasForbiddenMessage(action);

  return {
    role: cache.data?.role ?? null,
    permissions: cache.data?.permissions ?? [],
    tenant: cache.data?.tenant,
    loading: cache.data === null && cache.error === null,
    error: cache.error,
    can,
    forbidden,
    isViewer: cache.data?.role === "viewer",
    isMember: cache.data?.role === "member",
    isAdmin: cache.data?.role === "admin" || cache.data?.role === "owner",
    refresh: () => void fetchPermissions(),
  };
}

/** Reset cache between tests. */
export function resetSaasPermissionsCacheForTests(): void {
  cache.data = null;
  cache.error = null;
  cache.inflight = null;
}
