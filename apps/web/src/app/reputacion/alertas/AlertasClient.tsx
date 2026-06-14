"use client";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { PanelCard } from "@/core/ui/PanelCard";
import { ReputacionSubNav } from "@/features/reputacion/components/ReputacionSubNav";
import { useReputacionAlerts } from "@/features/reputacion/hooks";

export function AlertasClient() {
  const query = useReputacionAlerts();
  const items = query.data?.items ?? [];

  return (
    <ProtectedLayout module="reputacion">
      <div className="space-y-6">
        <ReputacionSubNav />

        <PanelCard>
          <h2 className="text-base font-semibold">Alertas de reseñas negativas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Notificaciones automáticas cuando entra una reseña baja o con sentimiento negativo.
          </p>
          {items.length ? (
            <ul className="mt-4 divide-y divide-border text-sm">
              {items.map((a) => (
                <li className="py-3" key={a.id}>
                  <p className="font-medium text-red-600">{a.severity === "high" ? "Urgente" : "Media"}</p>
                  <p className="mt-1">{a.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("es-ES")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Sin alertas activas.</p>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
