"use client";

import { useCallback } from "react";

import { OsEntityPreviewPage } from "@/features/os-shell/components/OsEntityPreviewPage";
import { osPlatformApi } from "@/features/os-shell/api";

export default function OsProyectosPage() {
  const load = useCallback(async () => {
    const res = await osPlatformApi.projects();
    const items = res.items ?? [];
    return {
      total: res.total ?? items.length,
      items: items.map((p) => ({
        id: p.id,
        label: p.name,
        meta: p.status ?? p.project_type,
      })),
    };
  }, []);

  return (
    <OsEntityPreviewPage
      title="Proyectos"
      description="Fuente: nelvyon_projects. Vinculados a clientes internos (nelvyon_clients), no a tenants SaaS."
      load={load}
    />
  );
}
