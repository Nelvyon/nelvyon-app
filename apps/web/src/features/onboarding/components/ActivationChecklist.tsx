"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import React, { useMemo } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { LOCAL_ACTIVATION_FIRST_TICKET } from "@/core/auth/sessionStorageKeys";
import { Button } from "@/core/ui/button";
import { SectionTitle } from "@/core/ui/typography";
import { canPerformAction } from "@/core/routing/guards";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { ACTIVATION_LOCAL_QUERY_KEY } from "@/features/onboarding/activationQueryKeys";
import { HelpContextLink } from "@/features/help/components/HelpContextLink";
import { useCompleteOnboardingStep, useOnboardingProgress } from "@/features/onboarding/hooks";
import type { OnboardingStepStatus } from "@/features/onboarding/types";
import { trackProductEvent } from "@/core/telemetry/productEvents";

type ActivationRow = {
  id: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  backendStepKey?: string;
  localStorageKey?: typeof LOCAL_ACTIVATION_FIRST_TICKET;
};

export const ACTIVATION_ROWS: ActivationRow[] = [
  {
    id: "ws",
    title: "Workspace activo",
    description: "Confirma que trabajas en el workspace correcto antes de crear clientes o campañas.",
    ctaLabel: "Selector de workspace en la cabecera",
  },
  {
    id: "tenant",
    title: "Perfil del workspace",
    description: "Marca, zona horaria e idioma para que entregables y reportes se vean profesionales.",
    href: "/settings",
    ctaLabel: "Configurar workspace",
    backendStepKey: "workspace",
  },
  {
    id: "client",
    title: "Primer cliente en Revenue",
    description: "Añade una cuenta real para conectar deals, campañas y facturación.",
    href: "/crm/clients/new",
    ctaLabel: "Crear cliente",
    backendStepKey: "first_contact",
  },
  {
    id: "ticket",
    title: "Primer ticket de soporte",
    description: "Comprueba que Helpdesk recibe solicitudes de tu equipo o clientes.",
    href: "/inbox/tickets/new",
    ctaLabel: "Abrir ticket",
    localStorageKey: LOCAL_ACTIVATION_FIRST_TICKET,
  },
  {
    id: "campaign",
    title: "Primera campaña",
    description: "Lanza una campaña piloto para validar el flujo comercial de punta a punta.",
    href: "/campaigns/new",
    ctaLabel: "Nueva campaña",
    backendStepKey: "first_campaign",
  },
];

function readLocalDone(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setActivationLocalDone(key: string, done = true) {
  try {
    if (done) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function backendStepMap(steps: OnboardingStepStatus[] | undefined): Map<string, boolean> {
  const m = new Map<string, boolean>();
  for (const s of steps ?? []) {
    m.set(s.key, s.completed);
  }
  return m;
}

export function ActivationChecklist() {
  const { user, accessToken } = useAuth();
  const { workspaceId } = useWorkspace();
  const progress = useOnboardingProgress(Boolean(user && accessToken && workspaceId));
  const completeMutation = useCompleteOnboardingStep();
  const queryClient = useQueryClient();
  const localTicketQuery = useQuery({
    queryKey: ACTIVATION_LOCAL_QUERY_KEY,
    queryFn: () => readLocalDone(LOCAL_ACTIVATION_FIRST_TICKET),
    enabled: Boolean(user && accessToken),
  });
  const localTicket = Boolean(localTicketQuery.data);

  const backendMap = useMemo(() => backendStepMap(progress.data?.steps), [progress.data?.steps]);

  const canMarkServer = user ? canPerformAction(user.role, "settings", "edit") : false;

  if (!user || !accessToken || !workspaceId) {
    return null;
  }

  const isRowDone = (row: ActivationRow): boolean => {
    if (row.id === "ws") return Boolean(workspaceId);
    if (row.localStorageKey) return localTicket;
    if (row.backendStepKey) return backendMap.get(row.backendStepKey) ?? false;
    return false;
  };

  const doneCount = ACTIVATION_ROWS.filter((r) => isRowDone(r)).length;
  const allDone = doneCount === ACTIVATION_ROWS.length;

  const onMarkServer = async (key: string) => {
    await completeMutation.mutateAsync({ stepKey: key });
    trackProductEvent("onboarding_step_completed", { step_key: key, module: "onboarding" });
  };

  const onMarkTicketLocal = () => {
    setActivationLocalDone(LOCAL_ACTIVATION_FIRST_TICKET, true);
    trackProductEvent("onboarding_step_completed", { step_key: "first_ticket_local", module: "onboarding" });
    void queryClient.invalidateQueries({ queryKey: [...ACTIVATION_LOCAL_QUERY_KEY] });
  };

  return (
    <section aria-label="Checklist de activación" className="rounded-xl border border-border bg-card p-5 shadow-card">
      <SectionTitle>Tus primeros 5 minutos</SectionTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        {allDone
          ? "¡Workspace listo! Explora los módulos o lanza una automatización rápida abajo."
          : "Completa estos pasos para dejar NELVYON operativo. Cada uno te acerca a leads, campañas y soporte real."}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(doneCount / ACTIVATION_ROWS.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums text-foreground">
          {doneCount}/{ACTIVATION_ROWS.length}
        </span>
      </div>
      <div className="pt-2">
        <HelpContextLink href="/help" label="¿Necesitas ayuda? Centro de ayuda" />
      </div>
      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {ACTIVATION_ROWS.map((row) => {
          const done = isRowDone(row);
          return (
            <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" key={row.id}>
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {done ? "✓ " : ""}
                  {row.title}
                </p>
                <p className="text-sm text-muted-foreground">{row.description}</p>
                {row.href && !done ? (
                  <Link className="mt-1 inline-block text-sm font-medium text-link underline-offset-2 hover:underline" href={row.href}>
                    {row.ctaLabel ?? "Abrir →"}
                  </Link>
                ) : row.ctaLabel && !row.href ? (
                  <p className="mt-1 text-xs text-muted-foreground">{row.ctaLabel}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {done ? (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success-foreground">
                    Hecho
                  </span>
                ) : row.backendStepKey ? (
                  <>
                    <Button
                      disabled={!canMarkServer || completeMutation.isPending}
                      onClick={() => void onMarkServer(row.backendStepKey!)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Marcar hecho
                    </Button>
                    {!canMarkServer ? (
                      <span className="text-xs text-muted-foreground">Requiere rol admin u operator.</span>
                    ) : null}
                  </>
                ) : row.localStorageKey ? (
                  <Button onClick={onMarkTicketLocal} size="sm" type="button" variant="secondary">
                    Marcar hecho
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {progress.error && !(progress.error instanceof ApiError && progress.error.status === 403) ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No pudimos sincronizar el progreso con el servidor. Puedes seguir con los enlaces de arriba.
        </p>
      ) : null}
    </section>
  );
}
