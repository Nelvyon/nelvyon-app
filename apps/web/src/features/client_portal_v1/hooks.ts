"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { portalApi } from "@/features/client_portal_v1/api";
import { usePortalAuth } from "@/features/client_portal_v1/PortalAuthContext";

export function usePortalMe() {
  const { isAuthenticated } = usePortalAuth();
  return useQuery({
    queryKey: ["portal", "me"],
    queryFn: portalApi.me,
    enabled: isAuthenticated,
  });
}

/**
 * El ciclo del cliente.
 *
 * `refetchOnWindowFocus` está puesto porque lo que este resumen contesta cambia
 * por acciones de OTRA gente: alguien de NELVYON acepta un servicio, un
 * compañero del cliente conecta una cuenta. Un cliente que vuelve a la pestaña
 * y sigue viendo «falta conectar Google Ads» cuando ya lo conectaron piensa que
 * el portal está roto.
 */
export function usePortalCiclo() {
  const { isAuthenticated } = usePortalAuth();
  return useQuery({
    queryKey: ["portal", "ciclo"],
    queryFn: portalApi.resumenDelCiclo,
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
  });
}

export function usePortalProjects(params?: { q?: string; page?: number }) {
  const { isAuthenticated } = usePortalAuth();
  return useQuery({
    queryKey: ["portal", "projects", params],
    queryFn: () => portalApi.listProjects({ page: params?.page ?? 1, page_size: 50, q: params?.q }),
    enabled: isAuthenticated,
  });
}

export function usePortalProject(id: string) {
  const { isAuthenticated } = usePortalAuth();
  return useQuery({
    queryKey: ["portal", "projects", id],
    queryFn: () => portalApi.getProject(id),
    enabled: isAuthenticated && Boolean(id),
  });
}

export function usePortalDeliverables(params?: { q?: string; project_id?: string; page?: number }) {
  const { isAuthenticated } = usePortalAuth();
  return useQuery({
    queryKey: ["portal", "deliverables", params],
    queryFn: () =>
      portalApi.listDeliverables({
        page: params?.page ?? 1,
        page_size: 50,
        q: params?.q,
        project_id: params?.project_id,
      }),
    enabled: isAuthenticated,
  });
}

export function usePortalDeliverable(id: string) {
  const { isAuthenticated } = usePortalAuth();
  return useQuery({
    queryKey: ["portal", "deliverables", id],
    queryFn: () => portalApi.getDeliverable(id),
    enabled: isAuthenticated && Boolean(id),
  });
}

export function usePortalApproveDeliverable(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feedback?: string) => portalApi.approveDeliverable(id, feedback),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portal", "deliverables"] });
      await queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", id] });
    },
  });
}

export function usePortalRejectDeliverable(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feedback: string) => portalApi.rejectDeliverable(id, feedback),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portal", "deliverables"] });
      await queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", id] });
    },
  });
}
