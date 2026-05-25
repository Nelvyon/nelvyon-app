"use client";

import { Copy, Key, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import {
  publicApiClient,
  type ApiKeyRecord,
  type PublicScope,
  type WebhookEndpoint,
} from "@/features/public-api/api";

const SCOPES: PublicScope[] = [
  "contacts",
  "campaigns",
  "chatbot",
  "forms",
  "analytics",
  "workflows",
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<PublicScope[]>(["contacts", "analytics"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [whUrl, setWhUrl] = useState("");
  const [whEvents, setWhEvents] = useState<string[]>(["contact.created"]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, whRes, evRes] = await Promise.all([
        publicApiClient.listKeys(),
        publicApiClient.listWebhooks(),
        publicApiClient.webhookEvents(),
      ]);
      setKeys(keysRes.api_keys ?? []);
      setWebhooks(whRes.endpoints ?? []);
      setAvailableEvents(evRes.events ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  function toggleScope(scope: PublicScope) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function createKey() {
    if (!name.trim() || selectedScopes.length === 0) return;
    setCreating(true);
    try {
      const r = await publicApiClient.createKey(name.trim(), selectedScopes);
      setNewKey(r.api_key ?? null);
      setName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (revokeId !== id) {
      setRevokeId(id);
      return;
    }
    await publicApiClient.revokeKey(id);
    setRevokeId(null);
    await load();
  }

  function toggleWhEvent(event: string) {
    setWhEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  async function createWebhook() {
    if (!whUrl.trim() || whEvents.length === 0) return;
    await publicApiClient.createWebhook(whUrl.trim(), whEvents);
    setWhUrl("");
    await load();
  }

  async function deleteWebhook(id: string) {
    await publicApiClient.deleteWebhook(id);
    await load();
  }

  return (
    <ProtectedLayout module="settings">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Key className="h-6 w-6" />
              API & Webhooks
            </h1>
            <p className="text-sm text-muted-foreground">
              Claves para la API pública <code className="text-xs">/api/public/v1/</code>
            </p>
          </div>
          <Link className="text-sm text-primary underline" href="/dashboard/api-docs">
            Ver documentación →
          </Link>
        </header>

        {newKey && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="mb-2 text-sm font-medium">Copia tu clave ahora — no se volverá a mostrar:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">{newKey}</code>
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(newKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Crear nueva key</h2>
          <input
            className="mb-3 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Nombre (ej. Producción web)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="mb-4 flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1 text-xs capitalize",
                  selectedScopes.includes(s) ? "border-primary bg-primary/10" : "opacity-70",
                )}
                onClick={() => toggleScope(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <Button disabled={creating || !name.trim()} onClick={createKey}>
            <Plus className="mr-2 h-4 w-4" />
            Generar API Key
          </Button>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Keys activas</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay API keys todavía.</p>
          ) : (
            <ul className="divide-y">
              {keys.map((k) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={k.id}>
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{k.key_prefix}</p>
                    <p className="text-xs text-muted-foreground">
                      Scopes: {(k.scopes ?? []).join(", ") || "—"} · Último uso:{" "}
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString("es-ES") : "nunca"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={revokeId === k.id ? "default" : "outline"}
                    className={revokeId === k.id ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
                    disabled={Boolean(k.revoked_at)}
                    onClick={() => revoke(k.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {k.revoked_at ? "Revocada" : revokeId === k.id ? "Confirmar" : "Revocar"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Webhooks salientes</h2>
          <input
            className="mb-3 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="https://tu-app.com/webhooks/nelvyon"
            value={whUrl}
            onChange={(e) => setWhUrl(e.target.value)}
          />
          <div className="mb-4 flex flex-wrap gap-2">
            {(availableEvents.length ? availableEvents : ["contact.created"]).map((ev) => (
              <button
                key={ev}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  whEvents.includes(ev) ? "border-primary bg-primary/10" : "opacity-70",
                )}
                onClick={() => toggleWhEvent(ev)}
              >
                {ev}
              </button>
            ))}
          </div>
          <Button className="mb-4" disabled={!whUrl.trim() || whEvents.length === 0} onClick={createWebhook}>
            Registrar webhook
          </Button>
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay endpoints registrados.</p>
          ) : (
            <ul className="divide-y">
              {webhooks.map((w) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={w.id}>
                  <div>
                    <p className="truncate text-sm font-medium">{w.url}</p>
                    <p className="text-xs text-muted-foreground">{(w.events ?? []).join(", ")}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => deleteWebhook(w.id)}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Eliminar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ProtectedLayout>
  );
}
