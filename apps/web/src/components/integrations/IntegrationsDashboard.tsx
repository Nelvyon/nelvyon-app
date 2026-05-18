"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { IntegrationCard, type IntegrationProvider } from "./IntegrationCard";

interface OAuthConnectionSummary {
  id: string;
  provider: IntegrationProvider;
  externalAccountName?: string;
  externalAccountId?: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const PROVIDERS: {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
}[] = [
  {
    provider: "google",
    name: "Google",
    description: "Google Ads, Search Console y Google Analytics 4 en una sola conexión.",
    icon: "🔵",
  },
  {
    provider: "meta",
    name: "Meta Ads",
    description: "Facebook e Instagram Ads para campañas y reporting.",
    icon: "📘",
  },
  {
    provider: "tiktok",
    name: "TikTok Ads",
    description: "Gestión y métricas de anuncios en TikTok.",
    icon: "🎵",
  },
  {
    provider: "linkedin",
    name: "LinkedIn Ads",
    description: "Campañas B2B y audiencias profesionales.",
    icon: "💼",
  },
];

function Toast({ message, variant }: { message: string; variant: "success" | "error" }) {
  const styles =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-900";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${styles}`}
      role="status"
    >
      {message}
    </div>
  );
}

export function IntegrationsDashboard() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<OAuthConnectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const fetchConnections = useCallback(async () => {
    const res = await fetch("/api/oauth/connections");
    if (res.ok) {
      const data = (await res.json()) as { connections: OAuthConnectionSummary[] };
      setConnections(data.connections);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchConnections();
      setLoading(false);
    })();
  }, [fetchConnections]);

  useEffect(() => {
    if (!searchParams) return;
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "google") {
      setToast({ message: "Google conectado correctamente", variant: "success" });
      void fetchConnections();
    } else if (success === "meta") {
      setToast({ message: "Meta conectado correctamente", variant: "success" });
      void fetchConnections();
    } else if (success === "tiktok") {
      setToast({ message: "TikTok conectado correctamente", variant: "success" });
      void fetchConnections();
    } else if (success === "linkedin") {
      setToast({ message: "LinkedIn conectado correctamente", variant: "success" });
      void fetchConnections();
    } else if (error === "google_denied") {
      setToast({ message: "Conexión con Google cancelada", variant: "error" });
    } else if (error === "google_failed") {
      setToast({ message: "No se pudo conectar con Google. Inténtalo de nuevo.", variant: "error" });
    } else if (error === "meta_denied") {
      setToast({ message: "Conexión con Meta cancelada", variant: "error" });
    } else if (error === "meta_failed") {
      setToast({ message: "No se pudo conectar con Meta. Inténtalo de nuevo.", variant: "error" });
    } else if (error === "tiktok_denied") {
      setToast({ message: "Conexión con TikTok cancelada", variant: "error" });
    } else if (error === "tiktok_failed") {
      setToast({ message: "No se pudo conectar con TikTok. Inténtalo de nuevo.", variant: "error" });
    } else if (error === "linkedin_denied") {
      setToast({ message: "Conexión con LinkedIn cancelada", variant: "error" });
    } else if (error === "linkedin_failed") {
      setToast({ message: "No se pudo conectar con LinkedIn. Inténtalo de nuevo.", variant: "error" });
    } else if (error) {
      setToast({ message: "Error al conectar la integración", variant: "error" });
    }
    if (success || error) {
      const t = window.setTimeout(() => setToast(null), 5000);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [searchParams, fetchConnections]);

  const connect = (provider: IntegrationProvider) => {
    window.location.href = `/api/oauth/${provider}`;
  };

  const disconnect = async (provider: IntegrationProvider) => {
    setLoadingProvider(provider);
    try {
      const res = await fetch(`/api/oauth/connections/${provider}`, { method: "DELETE" });
      if (res.ok) await fetchConnections();
    } finally {
      setLoadingProvider(null);
    }
  };

  const byProvider = (p: IntegrationProvider) => connections.find((c) => c.provider === p);

  if (loading) {
    return (
      <div className="grid animate-pulse gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <>
      {toast ? <Toast message={toast.message} variant={toast.variant} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((p) => {
          const conn = byProvider(p.provider);
          return (
            <IntegrationCard
              key={p.provider}
              provider={p.provider}
              name={p.name}
              description={p.description}
              icon={p.icon}
              connected={Boolean(conn)}
              accountName={conn?.externalAccountName}
              onConnect={() => connect(p.provider)}
              onDisconnect={() => void disconnect(p.provider)}
              loading={loadingProvider === p.provider}
            />
          );
        })}
      </div>
      <section className="mt-12 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Próximamente</h2>
        <p className="mt-2 text-sm text-slate-600">
          Shopify, WooCommerce, Slack, Zapier y más integraciones en el roadmap.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {["Shopify", "WooCommerce", "Slack", "Zapier", "Semrush"].map((label) => (
            <li
              key={label}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500"
            >
              {label}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
