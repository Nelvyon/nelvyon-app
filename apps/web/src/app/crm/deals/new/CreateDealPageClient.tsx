"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { useCreateDeal } from "@/features/deals/hooks";
import { CreateDealInput } from "@/features/deals/types";

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Calificado" },
  { id: "proposal", label: "Propuesta" },
  { id: "negotiation", label: "Negociación" },
  { id: "won", label: "Ganado" },
  { id: "lost", label: "Perdido" },
];

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CreateDealPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdRaw = searchParams?.get("client_id");
  const clientId = clientIdRaw && /^\d+$/.test(clientIdRaw) ? Number(clientIdRaw) : undefined;
  const mutation = useCreateDeal();
  const canCreate = user ? canPerformAction(user.role, "crm", "create") : false;

  const [form, setForm] = useState<CreateDealInput>({
    title: "",
    stage: "lead",
    currency: "EUR",
    client_id: clientId,
    value: undefined,
    probability: 10,
    notes: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await mutation.mutateAsync(form);
    router.push(`/crm/deals/${created.id}`);
  };

  return (
    <ProtectedLayout module="crm">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link className="hover:underline" href="/crm/deals">
            Deals
          </Link>
          <span>/</span>
          <span>Nuevo deal</span>
        </div>

        {mutation.error instanceof ApiError && mutation.error.status === 403 && (
          <ForbiddenNotice>
            <p>Tu rol no puede crear deals en este workspace.</p>
          </ForbiddenNotice>
        )}
        {mutation.error && !(mutation.error instanceof ApiError && mutation.error.status === 403) && (
          <ErrorNotice>
            <p>No pudimos crear el deal. Revisa los campos e inténtalo de nuevo.</p>
          </ErrorNotice>
        )}

        <PanelCard>
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Título del deal</span>
              <input
                className={inputClass}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                value={form.title}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Etapa</span>
                <select
                  className={inputClass}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  value={form.stage ?? "lead"}
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Valor (EUR)</span>
                <input
                  className={inputClass}
                  min={0}
                  onChange={(e) =>
                    setForm({ ...form, value: e.target.value ? Number(e.target.value) : undefined })
                  }
                  type="number"
                  value={form.value ?? ""}
                />
              </label>
            </div>
            {clientId ? (
              <p className="text-sm text-muted-foreground">Vinculado al cliente #{clientId}</p>
            ) : (
              <label className="block space-y-1">
                <span className="text-sm font-medium">ID cliente (opcional)</span>
                <input
                  className={inputClass}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  type="number"
                  value={form.client_id ?? ""}
                />
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-sm font-medium">Notas</span>
              <textarea
                className={inputClass}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                value={form.notes ?? ""}
              />
            </label>
            <Button disabled={!canCreate || mutation.isPending} type="submit">
              {mutation.isPending ? "Creando…" : "Crear deal"}
            </Button>
          </form>
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
