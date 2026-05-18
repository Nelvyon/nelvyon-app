"use client";

import { useCallback, useEffect, useState } from "react";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "elevenlabs", label: "ElevenLabs", placeholder: "el-..." },
  { id: "heygen", label: "HeyGen", placeholder: "hg-..." },
  { id: "runway", label: "Runway", placeholder: "rw-..." },
  { id: "stability", label: "Stability AI", placeholder: "sk-..." },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
  { id: "replicate", label: "Replicate", placeholder: "r8_..." },
] as const;

export function ApiKeysPanel() {
  const [configured, setConfigured] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshConfigured = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/user/api-keys", { credentials: "same-origin" });
      if (!res.ok) {
        setLoadError("No se pudo cargar la lista de proveedores.");
        return;
      }
      const d = (await res.json()) as { providers?: string[] };
      setConfigured(Array.isArray(d.providers) ? d.providers : []);
    } catch {
      setLoadError("No se pudo cargar la lista de proveedores.");
    }
  }, []);

  useEffect(() => {
    void refreshConfigured();
  }, [refreshConfigured]);

  async function handleSave(provider: string) {
    const key = inputs[provider]?.trim();
    if (!key) return;
    setSaving(provider);
    setActionError(null);
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
      if (!res.ok) {
        setActionError("No se pudo guardar la clave. Revisa el proveedor e inténtalo de nuevo.");
        return;
      }
      setConfigured((prev) => (prev.includes(provider) ? prev : [...prev, provider]));
      setInputs((prev) => ({ ...prev, [provider]: "" }));
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(provider: string) {
    setActionError(null);
    const res = await fetch(`/api/user/api-keys?provider=${encodeURIComponent(provider)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      setActionError("No se pudo eliminar la clave.");
      return;
    }
    setConfigured((prev) => prev.filter((p) => p !== provider));
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
      <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-zinc-100 md:text-base">API Keys propias</h3>
      <p className="mb-5 text-xs text-zinc-500 md:text-sm">
        Opcional. Si no configuras ninguna, NELVYON usa sus propias keys (según plan).
      </p>
      {loadError ? <p className="mb-3 text-xs text-amber-400">{loadError}</p> : null}
      {actionError ? <p className="mb-3 text-xs text-red-400">{actionError}</p> : null}
      <div className="space-y-3">
        {PROVIDERS.map((p) => {
          const isConfigured = configured.includes(p.id);
          return (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/30 p-3 sm:flex-row sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0"
            >
              <span className="w-full shrink-0 text-xs text-zinc-400 sm:w-28">{p.label}</span>
              {isConfigured ? (
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-emerald-400 sm:flex-1">● Configurada</span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(p.id)}
                    className="min-h-[44px] min-w-[44px] rounded-lg px-3 text-xs text-red-400 hover:bg-zinc-800/60 hover:text-red-300 sm:min-w-0"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={p.placeholder}
                    value={inputs[p.id] ?? ""}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="min-h-[44px] w-full flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm
                               text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none md:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSave(p.id)}
                    disabled={saving === p.id || !inputs[p.id]?.trim()}
                    className="min-h-[44px] shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors
                               hover:bg-indigo-500 disabled:opacity-40 sm:self-stretch"
                  >
                    {saving === p.id ? "…" : "Guardar"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
