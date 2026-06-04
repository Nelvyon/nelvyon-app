"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { osClientsApi } from "@/features/os-shell/clients/api";
import { osProjectsApi } from "@/features/os-shell/projects/api";
import { osPlatformApi } from "@/features/os-shell/api";

import { buildOsIaInsights } from "./insights";
import type { OsIaInsights } from "./types";

export function useOsIaInsights() {
  const [insights, setInsights] = useState<OsIaInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsRes, projectsRes, dealsRes, tasksRes, outputsRes] = await Promise.all([
        osClientsApi.list({ limit: 200 }),
        osProjectsApi.list({ limit: 200 }),
        osPlatformApi.deals(),
        osPlatformApi.tasks(),
        osPlatformApi.outputs(),
      ]);
      setInsights(
        buildOsIaInsights({
          clients: clientsRes.items ?? [],
          projects: projectsRes.items ?? [],
          deals: (dealsRes.items ?? []) as { title?: string; status?: string; client_id?: number | null }[],
          tasks: (tasksRes.items ?? []) as {
            id?: number;
            title?: string;
            status?: string;
            due_date?: string | null;
            client_id?: number | null;
            project_id?: number | null;
          }[],
          outputs: outputsRes.items ?? [],
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando datos operativos");
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { insights, loading, error, reload: load };
}
