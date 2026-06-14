"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { FunnelStepPipeline } from "@/features/funnels/components/FunnelPanels";
import { FunnelsSubNav } from "@/features/funnels/components/FunnelsSubNav";
import { DEFAULT_FUNNEL_STEPS } from "@/features/funnels/constants";
import { useCreateFunnel, useFunnelsList } from "@/features/funnels/hooks";

export function FunnelsBuilderClient() {
  const router = useRouter();
  const listQuery = useFunnelsList();
  const createMutation = useCreateFunnel();
  const [name, setName] = useState("Embudo principal");

  async function createFromTemplate() {
    const funnel = await createMutation.mutateAsync({
      name: name.trim() || "Nuevo embudo",
      steps: DEFAULT_FUNNEL_STEPS.map((s) => ({ name: s.name, exit_url: s.exit_url })),
      status: "draft",
    });
    if (funnel?.id) router.push(`/funnels/${funnel.id}`);
  }

  const items = listQuery.data?.items ?? [];

  return (
    <ProtectedLayout module="funnels">
      <div className="space-y-6">
        <FunnelsSubNav />

        {listQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar tus embudos.</p>
          </ErrorNotice>
        ) : null}

        <PanelCard>
          <h2 className="text-base font-semibold">Builder de embudos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define el recorrido Anuncio → Landing → Formulario → CRM. Cada paso enlaza con Publicidad, landings y deals.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del embudo"
              value={name}
            />
            <Button disabled={createMutation.isPending} onClick={() => void createFromTemplate()} type="button">
              {createMutation.isPending ? "Creando…" : "Crear con plantilla élite"}
            </Button>
          </div>
          <div className="mt-6">
            <FunnelStepPipeline steps={[...DEFAULT_FUNNEL_STEPS]} />
          </div>
        </PanelCard>

        <PanelCard>
          <h2 className="text-base font-semibold">Embudos existentes</h2>
          {listQuery.isLoading ? (
            <SkeletonListRows rows={4} />
          ) : items.length ? (
            <ul className="mt-3 divide-y divide-border">
              {items.map((f) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={f.id}>
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.step_count ?? f.steps?.length ?? 0} pasos · {f.status}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/funnels/${f.id}`}>Editar y métricas</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Aún no hay embudos. Usa la plantilla superior para empezar.
            </p>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
