"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CancelSubscriptionFlow } from "@/components/dashboard/CancelSubscriptionFlow";
import { ChangePlanFlow } from "@/components/dashboard/ChangePlanFlow";
import { PaymentMethodCard } from "@/components/dashboard/PaymentMethodCard";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardSettingsApi } from "@/features/dashboard/api";
import { DashboardTabs, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";

const DELETE_CONFIRM_PHRASE = "ELIMINAR MI CUENTA";

const TABS = [
  { id: "general", label: "General" },
  { id: "whitelabel", label: "White-label" },
  { id: "apikeys", label: "API Keys" },
  { id: "equipo", label: "Equipo" },
  { id: "facturacion", label: "Facturación" },
  { id: "gdpr", label: "GDPR" },
  { id: "push", label: "Notificaciones Push" },
];

type CancellationStatus = {
  isCancelling: boolean;
  periodEnd: string | null;
  daysLeft: number;
  plan: string;
  canChangePlan: boolean;
};

export default function DashboardSettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("general");
  const [workspaceName, setWorkspaceName] = useState("");
  const [language, setLanguage] = useState("es");
  const [brandDomain, setBrandDomain] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [apiKeys, setApiKeys] = useState<Record<string, unknown>[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [gdprItems, setGdprItems] = useState<unknown[]>([]);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [status, setStatus] = useState<CancellationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/user/cancellation-status", { credentials: "same-origin", cache: "no-store" });
      if (res.ok) setStatus((await res.json()) as CancellationStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (tab === "apikeys") {
      dashboardSettingsApi.apiKeys().then((r) => setApiKeys(r.api_keys ?? [])).catch(() => setApiKeys([]));
    }
    if (tab === "gdpr") {
      dashboardSettingsApi.gdprRequests().then((r) => setGdprItems(r.items ?? [])).catch(() => setGdprItems([]));
    }
  }, [tab]);

  const plan = status?.plan ?? "free";

  async function createApiKey() {
    if (!newKeyName.trim()) return;
    await dashboardSettingsApi.createApiKey(newKeyName, ["read", "write"]);
    setNewKeyName("");
    const r = await dashboardSettingsApi.apiKeys();
    setApiKeys(r.api_keys ?? []);
  }

  async function handleExport() {
    setExportBusy(true);
    setExportMessage(null);
    try {
      const res = await fetch("/api/user/export-data", { method: "POST", credentials: "same-origin" });
      if (!res.ok) {
        setExportMessage("No se pudo generar la exportación.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nelvyon-datos.json";
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage("Descarga iniciada.");
    } finally {
      setExportBusy(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmText.trim() }),
      });
      if (!res.ok) {
        setDeleteMessage("No se pudo eliminar la cuenta.");
        return;
      }
      router.push("/goodbye");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <ProtectedLayout module="settings">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-muted-foreground">Workspace, equipo, facturación y privacidad</p>
        </div>

        <DashboardTabs active={tab} onChange={setTab} tabs={TABS} />

        {tab === "general" ? (
          <div className="space-y-4 rounded-xl border p-4">
            <label className="block text-sm">
              Nombre del workspace
              <input className="mt-1 w-full rounded-lg border px-3 py-2" onChange={(e) => setWorkspaceName(e.target.value)} value={workspaceName} />
            </label>
            <label className="block text-sm">
              Idioma
              <select className="mt-1 w-full rounded-lg border px-3 py-2" onChange={(e) => setLanguage(e.target.value)} value={language}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
            <Button>Guardar cambios</Button>
          </div>
        ) : null}

        {tab === "whitelabel" ? (
          <div className="space-y-4 rounded-xl border p-4">
            <label className="block text-sm">
              Dominio personalizado
              <input className="mt-1 w-full rounded-lg border px-3 py-2" onChange={(e) => setBrandDomain(e.target.value)} placeholder="app.tuempresa.com" value={brandDomain} />
            </label>
            <label className="block text-sm">
              Color principal
              <input className="mt-1 h-10 w-full rounded-lg border" onChange={(e) => setBrandColor(e.target.value)} type="color" value={brandColor} />
            </label>
            <Button>Guardar white-label</Button>
          </div>
        ) : null}

        {tab === "apikeys" ? (
          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border px-3 py-2" onChange={(e) => setNewKeyName(e.target.value)} placeholder="Nombre de la key" value={newKeyName} />
              <Button onClick={createApiKey}>Crear</Button>
            </div>
            <ul className="space-y-2 text-sm">
              {apiKeys.map((k) => (
                <li className="flex items-center justify-between rounded border px-3 py-2" key={String(k.id)}>
                  <span>{String(k.name ?? k.id)}</span>
                  <Button onClick={() => dashboardSettingsApi.revokeApiKey(String(k.id)).then(() => dashboardSettingsApi.apiKeys().then((r) => setApiKeys(r.api_keys ?? [])))} size="sm" variant="outline">
                    Revocar
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "equipo" ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Invitaciones de equipo disponibles para administradores. Por ahora solo el admin del workspace tiene acceso completo.
          </div>
        ) : null}

        {tab === "facturacion" ? (
          <div className="space-y-6">
            <div className="rounded-xl border p-4">
              <p className="text-sm">
                Plan actual: <span className="font-semibold capitalize">{loading ? "…" : plan}</span>
              </p>
              {status?.isCancelling && status.periodEnd ? (
                <p className="mt-2 text-sm text-amber-700">Cancelación programada — {status.daysLeft} días restantes.</p>
              ) : null}
              {plan !== "free" && !status?.isCancelling ? (
                <Button className="mt-4" onClick={() => setCancelModalOpen(true)} variant="outline">
                  Cancelar suscripción
                </Button>
              ) : null}
              {plan === "free" ? (
                <Button asChild className="mt-4">
                  <Link href="/pricing">Ver planes</Link>
                </Button>
              ) : null}
            </div>
            {status?.canChangePlan && plan !== "free" ? <ChangePlanFlow currentPlan={plan} onChanged={() => void loadStatus()} /> : null}
            <PaymentMethodCard />
          </div>
        ) : null}

        {tab === "gdpr" ? (
          <div className="space-y-4 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Exporta o elimina datos según RGPD.</p>
            <Button disabled={exportBusy} onClick={handleExport}>
              {exportBusy ? "Generando…" : "Exportar mis datos"}
            </Button>
            {exportMessage ? <p className="text-sm">{exportMessage}</p> : null}
            <Button onClick={() => setDeleteModalOpen(true)} variant="outline">
              Eliminar cuenta
            </Button>
            {gdprItems.length ? (
              <pre className="max-h-40 overflow-auto text-xs">{JSON.stringify(gdprItems, null, 2)}</pre>
            ) : null}
          </div>
        ) : null}

        {tab === "push" ? (
          <div className="rounded-xl border p-4">
            <label className="flex items-center gap-2 text-sm">
              <input checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} type="checkbox" />
              Activar notificaciones push del workspace
            </label>
          </div>
        ) : null}
      </div>

      {cancelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-6">
            <CancelSubscriptionFlow onClose={() => { setCancelModalOpen(false); void loadStatus(); }} onCompleted={() => void loadStatus()} plan={plan} />
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Eliminar cuenta</h2>
            <p className="mt-2 text-sm text-muted-foreground">Escribe {DELETE_CONFIRM_PHRASE} para confirmar.</p>
            <input className="mt-4 w-full rounded-lg border px-3 py-2" onChange={(e) => setDeleteConfirmText(e.target.value)} value={deleteConfirmText} />
            {deleteMessage ? <p className="mt-2 text-sm text-destructive">{deleteMessage}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setDeleteModalOpen(false)} variant="outline">Cancelar</Button>
              <Button disabled={deleteBusy || deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE} onClick={handleDeleteAccount}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ProtectedLayout>
  );
}
