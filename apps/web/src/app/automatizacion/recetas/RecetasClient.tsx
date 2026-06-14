"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import {
  AUTOMATION_RECIPES,
  CONNECTOR_LABELS,
  CONNECTOR_LINKS,
} from "@/features/automatizacion/constants";
import { AutomatizacionSubNav } from "@/features/automatizacion/components/AutomatizacionSubNav";
import { useCreateRuleFromRecipe, useCreateWorkflowFromRecipe } from "@/features/automatizacion/hooks";

export function RecetasClient() {
  const router = useRouter();
  const createWorkflow = useCreateWorkflowFromRecipe();
  const createRule = useCreateRuleFromRecipe();

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-6">
        <AutomatizacionSubNav />

        <p className="text-sm text-muted-foreground">
          Librería de recetas predefinidas. Un clic crea el flujo base — luego lo afinas en el editor.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {AUTOMATION_RECIPES.map((recipe) => (
            <PanelCard key={recipe.id}>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {CONNECTOR_LABELS[recipe.connector]}
              </p>
              <h3 className="mt-1 font-semibold">{recipe.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{recipe.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Si <span className="font-mono">{recipe.trigger}</span> →{" "}
                <span className="font-mono">{recipe.action}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled={createWorkflow.isPending}
                  onClick={() =>
                    void createWorkflow.mutateAsync(recipe).then((wf) => {
                      if (wf?.id) router.push(`/automatizacion/editor?id=${wf.id}`);
                    })
                  }
                  size="sm"
                  type="button"
                >
                  Crear flujo visual
                </Button>
                <Button
                  disabled={createRule.isPending}
                  onClick={() => void createRule.mutateAsync(recipe)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Crear regla CRM
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={CONNECTOR_LINKS[recipe.connector]}>Abrir conector</Link>
                </Button>
              </div>
            </PanelCard>
          ))}
        </div>
      </div>
    </ProtectedLayout>
  );
}
