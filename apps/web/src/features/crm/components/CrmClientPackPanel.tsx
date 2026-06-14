"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { apiClient } from "@/core/api";
import { ApiError } from "@/core/api/types";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import {
  buildPortalInviteUrl,
  osPortalApi,
} from "@/features/os-shell/portal/api";
import { getPackMeta } from "@/lib/packs/packRegistry";
import type { PackId, PackRunRecord } from "@/lib/packs/types";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CrmClientPackPanel({
  saasClientId,
  contactEmail,
}: {
  saasClientId: number;
  contactEmail?: string | null;
}) {
  const [run, setRun] = useState<PackRunRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(contactEmail?.trim() ?? "");
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ run: PackRunRecord | null }>(
        `/api/platform/pack-runs?saas_client_id=${saasClientId}`,
        { tenantScoped: true },
      );
      setRun(res.run);
    } catch {
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [saasClientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onInvite = async () => {
    if (!run?.os_client_id || !email.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const result = await osPortalApi.createInvite({
        client_id: run.os_client_id,
        email: email.trim(),
      });
      setInviteUrl(buildPortalInviteUrl(result.token));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear la invitación");
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <PanelCard>
        <p className="text-sm text-muted-foreground">Comprobando Growth Pack…</p>
      </PanelCard>
    );
  }

  if (!run) {
    return (
      <PanelCard>
        <h2 className="text-base font-semibold text-foreground">Growth Pack</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Este cliente aún no tiene un pack autónomo ejecutado. Lanza uno desde Nelvyon OS.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/os/packs">Lanzar Growth Pack</Link>
        </Button>
      </PanelCard>
    );
  }

  const meta = getPackMeta(run.pack_id as PackId);
  const reportPath = meta?.reportPath ?? "/dashboard/local-growth";

  return (
    <PanelCard accent={meta?.accent}>
      <h2 className="text-base font-semibold text-foreground">
        {meta?.name ?? "Growth Pack"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estado: <strong>{run.status}</strong>
        {run.report ? ` · QA ${run.report.kpis.avg_qa_score}%` : null}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={reportPath}>Ver informe</Link>
        </Button>
        {run.saas_campaign_id ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/campaigns/${run.saas_campaign_id}`}>Campaña email</Link>
          </Button>
        ) : null}
        {run.os_project_id ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/os/proyectos/${run.os_project_id}`}>Proyecto OS</Link>
          </Button>
        ) : null}
      </div>

      {run.os_client_id ? (
        <div className="mt-6 space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Portal del cliente</p>
          <p className="text-sm text-muted-foreground">
            Invita al contacto para que revise landing, SEO, chatbot e informe en el portal.
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input
              className={inputClass}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              value={email}
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {inviteUrl ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Enlace de invitación (copia y envía al cliente):</p>
              <p className="mt-2 break-all text-link">{inviteUrl}</p>
            </div>
          ) : (
            <Button disabled={inviting || !email.trim()} onClick={() => void onInvite()} size="sm">
              {inviting ? "Generando…" : "Invitar al portal"}
            </Button>
          )}
        </div>
      ) : null}
    </PanelCard>
  );
}
