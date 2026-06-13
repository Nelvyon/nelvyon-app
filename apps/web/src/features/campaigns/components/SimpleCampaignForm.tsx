"use client";

import Link from "next/link";
import React, { FormEvent, useId, useState } from "react";

import { Button } from "@/core/ui/button";
import { useClients } from "@/features/crm/hooks";
import {
  CAMPAIGN_PLATFORM_LABELS,
  CAMPAIGN_TYPE_LABELS,
  simpleCampaignFormSchema,
  type SimpleCampaignFormOutput,
} from "@/features/campaigns/simpleCampaignSchema";

interface SimpleCampaignFormProps {
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: SimpleCampaignFormOutput) => Promise<void> | void;
}

export function SimpleCampaignForm({ canSubmit, isSubmitting = false, onSubmit }: SimpleCampaignFormProps) {
  const id = useId();
  const clientsQuery = useClients();
  const clients = clientsQuery.data?.items ?? [];

  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("email");
  const [campaignType, setCampaignType] = useState("nurturing");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = simpleCampaignFormSchema.safeParse({
      client_id: clientId,
      name,
      platform,
      campaign_type: campaignType,
      content,
      target_audience: targetAudience,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los campos del formulario.");
      return;
    }
    await onSubmit(parsed.data);
  };

  if (clientsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando clientes…</p>;
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <p className="text-sm text-foreground">Primero necesitas al menos un cliente en Revenue.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Las campañas se vinculan a una cuenta para segmentar y medir resultados.
        </p>
        <Button asChild className="mt-4">
          <Link href="/crm/clients/new">Añadir primer cliente</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-card" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${id}-client`}>
          Cliente
        </label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id={`${id}-client`}
          onChange={(e) => setClientId(e.target.value)}
          required
          value={clientId}
        >
          <option value="">Selecciona un cliente…</option>
          {clients.map((client) => (
            <option key={client.id} value={String(client.id)}>
              {client.business_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${id}-name`}>
          Nombre de la campaña
        </label>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id={`${id}-name`}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Bienvenida nuevos clientes Q2"
          required
          value={name}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor={`${id}-platform`}>
            Canal
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id={`${id}-platform`}
            onChange={(e) => setPlatform(e.target.value)}
            value={platform}
          >
            {Object.entries(CAMPAIGN_PLATFORM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor={`${id}-type`}>
            Objetivo
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id={`${id}-type`}
            onChange={(e) => setCampaignType(e.target.value)}
            value={campaignType}
          >
            {Object.entries(CAMPAIGN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${id}-audience`}>
          Audiencia (opcional)
        </label>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id={`${id}-audience`}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="Ej.: Clientes nuevos en España"
          value={targetAudience}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${id}-content`}>
          Mensaje o brief (opcional)
        </label>
        <textarea
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id={`${id}-content`}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe el mensaje principal o la propuesta de valor."
          value={content}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!canSubmit ? (
        <p className="text-sm text-warning-foreground">No tienes permiso para crear campañas.</p>
      ) : null}

      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Creando campaña…" : "Crear campaña"}
      </Button>
    </form>
  );
}
