"use client";

import { useCallback } from "react";

import { OsEntityPreviewPage } from "@/features/os-shell/components/OsEntityPreviewPage";
import { osPlatformApi } from "@/features/os-shell/api";

export default function OsClientesPage() {
  const load = useCallback(async () => {
    const res = await osPlatformApi.clients();
    const items = res.items ?? [];
    return {
      total: res.total ?? items.length,
      items: items.map((c) => ({
        id: c.id,
        label: c.business_name,
        meta: c.sector,
      })),
    };
  }, []);

  return (
    <OsEntityPreviewPage
      title="Clientes internos"
      description="Fuente: tabla nelvyon_clients (operación NELVYON). No confundir con saas_contacts del CRM SaaS del cliente."
      load={load}
    />
  );
}
