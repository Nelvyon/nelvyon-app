"use client";

import React, { useState } from "react";
import Link from "next/link";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { usePackRun } from "@/features/packs/hooks";
import { getPackMeta } from "@/lib/packs/packRegistry";
import type { PackMeta } from "@/lib/packs/packRegistry";
import type { PackId, PackRunRecord } from "@/lib/packs/types";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type GrowthPackFormProps = {
  meta: PackMeta;
  extraFields?: React.ReactNode;
  onKickoff: (body: Record<string, unknown>) => Promise<PackRunRecord>;
  onSuccess?: (runId: string) => void;
  defaultValues?: Record<string, unknown>;
};

export function GrowthPackKickoffForm({
  meta,
  extraFields,
  onKickoff,
  onSuccess,
  defaultValues = {},
}: GrowthPackFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_name: "",
    sector: meta.sectors[0]?.id ?? "",
    city: "",
    country: "ES",
    contact_email: "",
    value_proposition: "",
    primary_cta: "",
    website_url: "",
    ...defaultValues,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const run = await onKickoff({
        ...form,
        contact_email: form.contact_email || undefined,
        website_url: form.website_url || undefined,
      });
      onSuccess?.(run.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al lanzar el pack");
    } finally {
      setPending(false);
    }
  };

  return (
    <PanelCard accent={meta.accent}>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Nombre comercial</span>
            <input
              className={inputClass}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              required
              value={String(form.business_name)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Sector</span>
            <select
              className={inputClass}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              value={String(form.sector)}
            >
              {meta.sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Ciudad</span>
            <input
              className={inputClass}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
              value={String(form.city)}
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Propuesta de valor</span>
            <textarea
              className={inputClass}
              onChange={(e) => setForm({ ...form, value_proposition: e.target.value })}
              required
              rows={2}
              value={String(form.value_proposition)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">CTA principal</span>
            <input
              className={inputClass}
              onChange={(e) => setForm({ ...form, primary_cta: e.target.value })}
              required
              value={String(form.primary_cta)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email contacto</span>
            <input
              className={inputClass}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              type="email"
              value={String(form.contact_email)}
            />
          </label>
          {extraFields}
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button disabled={pending} type="submit">
          {pending ? "Ejecutando pack autónomo…" : `Lanzar ${meta.name}`}
        </Button>
      </form>
    </PanelCard>
  );
}

export function PackRunProgress({ runId, packId }: { runId: string; packId: PackId }) {
  const query = usePackRun(packId, runId);

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando progreso del pack…</p>;
  }
  if (!query.data) return null;

  const run = query.data;
  return (
    <PanelCard>
      <p className="font-semibold text-foreground">Estado: {run.status}</p>
      <ul className="mt-4 space-y-2">
        {run.steps.map((step) => (
          <li className="flex items-start gap-2 text-sm" key={step.key}>
            <span
              className={
                step.status === "done"
                  ? "text-success-foreground"
                  : step.status === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }
            >
              {step.status === "done" ? "✓" : step.status === "running" ? "…" : "○"}
            </span>
            <span>
              {step.label}
              {step.detail ? (
                <span className="block text-xs text-muted-foreground">{step.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {run.report ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{run.report.summary}</p>
            <p className="mt-2 text-muted-foreground">
              QA medio: {run.report.kpis.avg_qa_score} · Entregables:{" "}
              {run.report.kpis.deliverables_published}
            </p>
          </div>
          <PackRunSuccessLinks run={run} />
        </div>
      ) : null}
    </PanelCard>
  );
}

export function PackRunSuccessLinks({ run }: { run: PackRunRecord }) {
  const meta = getPackMeta(run.pack_id as PackId);
  if (run.status !== "completed" && run.status !== "needs_review") return null;

  return (
    <div className="flex flex-wrap gap-2">
      {run.report?.kpis.saas_client_id ? (
        <Button asChild size="sm" variant="outline">
          <Link href={`/crm/clients/${run.report.kpis.saas_client_id}`}>Invitar cliente al portal</Link>
        </Button>
      ) : null}
      {meta ? (
        <Button asChild size="sm" variant="outline">
          <Link href={meta.reportPath}>Ver informe completo</Link>
        </Button>
      ) : null}
      {run.report?.kpis.saas_campaign_id ? (
        <Button asChild size="sm" variant="outline">
          <Link href={`/campaigns/${run.report.kpis.saas_campaign_id}`}>Activar campaña</Link>
        </Button>
      ) : null}
    </div>
  );
}
