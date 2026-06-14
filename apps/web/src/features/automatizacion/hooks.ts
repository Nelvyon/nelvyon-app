"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/core/ui/toastFeedback";
import { automatizacionApi } from "@/features/automatizacion/api";
import type { AutomationRecipe } from "@/features/automatizacion/types";

export function useAutomatizacionUnifiedReporting() {
  return useQuery({
    queryKey: ["automatizacion", "unified-reporting"],
    queryFn: () => automatizacionApi.unifiedReporting(),
    refetchInterval: 60_000,
  });
}

export function useAutomatizacionWorkflows() {
  return useQuery({
    queryKey: ["automatizacion", "workflows"],
    queryFn: () => automatizacionApi.listWorkflows(),
  });
}

export function useAutomatizacionRules() {
  return useQuery({
    queryKey: ["automatizacion", "rules"],
    queryFn: () => automatizacionApi.listRules(),
  });
}

export function useCreateWorkflowFromRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipe: AutomationRecipe) => {
      return automatizacionApi.createWorkflow({
        name: recipe.title,
        description: recipe.description,
        nodes: [
          {
            id: "trigger_1",
            nodeType: recipe.trigger,
            category: "trigger",
            label: recipe.trigger,
            config: { connector: recipe.connector },
            position: { x: 80, y: 120 },
          },
          {
            id: "action_1",
            nodeType: recipe.action,
            category: "action",
            label: recipe.action,
            config: { connector: recipe.connector },
            position: { x: 320, y: 120 },
          },
          {
            id: "end_1",
            nodeType: "end",
            category: "end",
            label: "Fin",
            config: {},
            position: { x: 560, y: 120 },
          },
        ],
        edges: [
          { id: "e1", source: "trigger_1", target: "action_1" },
          { id: "e2", source: "action_1", target: "end_1" },
        ],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automatizacion"] });
      toastSuccess("Flujo creado desde receta.");
    },
    onError: () => toastError("No se pudo crear el flujo."),
  });
}

export function useCreateRuleFromRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipe: AutomationRecipe) =>
      automatizacionApi.createRule({
        name: recipe.title,
        description: recipe.description,
        trigger_type: recipe.trigger === "cart_abandoned" ? "manual" : recipe.trigger,
        action_type: recipe.action,
        is_active: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automatizacion"] });
      toastSuccess("Regla CRM creada desde receta.");
    },
    onError: () => toastError("No se pudo crear la regla."),
  });
}
