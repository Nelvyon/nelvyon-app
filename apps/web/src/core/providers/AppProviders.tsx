"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

import { AuthProvider } from "@/core/auth/AuthContext";
import { ThemeProvider } from "@/core/theme/ThemeProvider";
import { ToastProvider } from "@/core/ui/ToastProvider";
import { WorkspaceProvider } from "@/core/workspace/WorkspaceContext";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
