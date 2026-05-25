"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

import { AuthProvider } from "@/core/auth/AuthContext";
import { ThemeProvider } from "@/core/theme/ThemeProvider";
import { ToastProvider } from "@/core/ui/ToastProvider";
import { WorkspaceProvider } from "@/core/workspace/WorkspaceContext";
import { RegionBootstrap } from "@/core/i18n/RegionBootstrap";
import { WhitelabelProvider } from "@/core/whitelabel/WhitelabelProvider";

export function AppProviders({
  children,
  whitelabelInitial,
}: {
  children: ReactNode;
  whitelabelInitial?: import("@/core/whitelabel/types").WhitelabelApplyConfig | null;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <WhitelabelProvider initial={whitelabelInitial ?? null}>
                <RegionBootstrap />
                {children}
              </WhitelabelProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
