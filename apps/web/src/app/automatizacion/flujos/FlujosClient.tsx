"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { AutomatizacionSubNav } from "@/features/automatizacion/components/AutomatizacionSubNav";
import { automatizacionApi } from "@/features/automatizacion/api";
import { useAutomatizacionWorkflows } from "@/features/automatizacion/hooks";

export function FlujosClient() {
  const router = useRouter();
  const query = useAutomatizacionWorkflows();
  const items = query.data?.items ?? [];

  async function createNew() {
    try {
      const wf = await automatizacionApi.createWorkflow({
        name: "Nuevo flujo",
        description: "Si pasa X, haz Y",
        nodes: [
          {
            id: "trigger_1",
            nodeType: "contact_created",
            category: "trigger",
            label: "Trigger",
            config: {},
            position: { x: 80, y: 120 },
          },
          {
            id: "end_1",
            nodeType: "end",
            category: "end",
            label: "Fin",
            config: {},
            position: { x: 400, y: 120 },
          },
        ],
        edges: [{ id: "e1", source: "trigger_1", target: "end_1" }],
      });
      router.push(`/automatizacion/editor?id=${wf.id}`);
    } catch {
      /* preserved */
    }
  }

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-6">
        <AutomatizacionSubNav />

        {query.error ? (
          <ErrorNotice>
            <p>No pudimos cargar tus flujos.</p>
          </ErrorNotice>
        ) : null}

        <PanelCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Flujos visuales</h2>
              <p className="text-sm text-muted-foreground">Editor drag-and-drop: triggers, acciones y lógica.</p>
            </div>
            <Button onClick={() => void createNew()} type="button">
              Nuevo flujo
            </Button>
          </div>
          {query.isLoading ? (
            <SkeletonListRows rows={4} />
          ) : items.length ? (
            <ul className="mt-4 divide-y divide-border">
              {items.map((wf) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={wf.id}>
                  <div>
                    <p className="font-medium">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {wf.runs_count ?? 0} ejecuciones · {wf.is_active ? "activo" : "borrador"}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/automatizacion/editor?id=${wf.id}`}>Editar</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Crea un flujo o usa una receta predefinida en la pestaña Recetas.
            </p>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
