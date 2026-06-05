"use client";

import type { ReactNode } from "react";

import type { SaasAction } from "../saasPermissions";

import { useSaasPermissions } from "../useSaasPermissions";
import { SaasPermissionDenied } from "./SaasPermissionDenied";

export function SaasCan({
  action,
  children,
  fallback,
  showDeniedMessage = false,
}: {
  action: SaasAction;
  children: ReactNode;
  fallback?: ReactNode;
  showDeniedMessage?: boolean;
}) {
  const { can, forbidden, loading } = useSaasPermissions();

  if (loading) return null;
  if (can(action)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  if (showDeniedMessage) return <SaasPermissionDenied message={forbidden(action)} />;
  return null;
}
