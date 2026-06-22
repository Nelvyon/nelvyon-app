"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface Integration {
  id: string;
  provider: string;
  displayName: string;
  icon: string;
  status: "connected" | "disconnected" | "error" | "pending";
  connectedAccount: string | null;
  scopes: string[];
  lastSyncAt: string | null;
  envRequired: string[];
}

interface OAuthStatus {
  configured: boolean;
  connections: Integration[];
}

const INTEGRATION_CATEGORIES = [
  {
    label: "Redes Sociales",
    providers: ["meta", "google", "linkedin", "tiktok"],
    icon: "📱",
  },
  {
    label: "Email & Comunicación",
    providers: ["slack", "gmail", "mailchimp"],
    icon: "📧",
  },
  {
    label: "CRM & Ventas",
    providers: ["hubspot", "salesforce", "pipedrive"],
    icon: "🎯",
  },
  {
    label: "Pagos & Facturación",
    providers: ["stripe", "paypal"],
    icon: "💳",
  },
  {
    label: "Analítica",
    providers: ["google_analytics", "hotjar", "mixpanel"],
    icon: "📊",
  },
];

const STATIC_PROVIDERS: Integration[] = [
  { id: "meta", provider: "meta", displayName: "Meta (Facebook/Instagram)", icon: "📘", status: "disconnected", connectedAccount: null, scopes: ["pages_manage_posts", "instagram_basic"], lastSyncAt: null, envRequired: ["META_CLIENT_ID", "META_CLIENT_SECRET"] },
  { id: "google", provider: "google", displayName: "Google (Ads/Analytics/Calendar)", icon: "🔍", status: "disconnected", connectedAccount: null, scopes: ["analytics.readonly", "calendar"], lastSyncAt: null, envRequired: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
  { id: "slack", provider: "slack", displayName: "Slack", icon: "💬", status: "disconnected", connectedAccount: null, scopes: ["chat:write", "channels:read"], lastSyncAt: null, envRequired: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"] },
  { id: "hubspot", provider: "hubspot", displayName: "HubSpot", icon: "🔶", status: "disconnected", connectedAccount: null, scopes: ["contacts", "deals"], lastSyncAt: null, envRequired: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"] },
  { id: "stripe", provider: "stripe", displayName: "Stripe", icon: "💳", status: "connected", connectedAccount: "nelvyon@stripe", scopes: ["payments", "subscriptions"], lastSyncAt: new Date().toISOString(), envRequired: ["STRIPE_SECRET_KEY"] },
  { id: "linkedin", provider: "linkedin", displayName: "LinkedIn", icon: "💼", status: "disconnected", connectedAccount: null, scopes: ["w_member_social", "r_organization_social"], lastSyncAt: null, envRequired: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"] },
  { id: "tiktok", provider: "tiktok", displayName: "TikTok for Business", icon: "🎵", status: "disconnected", connectedAccount: null, scopes: ["video.upload", "user.info.basic"], lastSyncAt: null, envRequired: ["TIKTOK_CLIENT_ID", "TIKTOK_CLIENT_SECRET"] },
  { id: "mailchimp", provider: "mailchimp", displayName: "Mailchimp", icon: "🐒", status: "disconnected", connectedAccount: null, scopes: ["campaigns"], lastSyncAt: null, envRequired: ["MAILCHIMP_API_KEY"] },
  { id: "salesforce", provider: "salesforce", displayName: "Salesforce", icon: "☁️", status: "disconnected", connectedAccount: null, scopes: ["api", "refresh_token"], lastSyncAt: null, envRequired: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"] },
];

function IntegrationCard({ integration, onConnect }: { integration: Integration; onConnect: (id: string) => void }) {
  const isConnected = integration.status === "connected";
  return (
    <NelvyonDsCard className={`flex flex-col gap-3 p-4 transition-colors ${isConnected ? "border-green-500/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{integration.icon}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{integration.displayName}</p>
            {isConnected && integration.connectedAccount && (
              <p className="text-xs text-muted-foreground">{integration.connectedAccount}</p>
            )}
          </div>
        </div>
        <NelvyonDsBadge tone={isConnected ? "success" : integration.status === "error" ? "danger" : "primary"} size="sm">
          {isConnected ? "Conectado" : integration.status === "error" ? "Error" : "Sin conectar"}
        </NelvyonDsBadge>
      </div>

      {!isConnected && integration.envRequired.length > 0 && (
        <div className="rounded-lg bg-muted/20 px-3 py-2">
          <p className="text-xs text-muted-foreground">Variables necesarias en Railway:</p>
          <p className="mt-1 font-mono text-xs text-primary">{integration.envRequired.join(", ")}</p>
        </div>
      )}

      {isConnected && integration.lastSyncAt && (
        <p className="text-xs text-muted-foreground">
          Último sync: {new Date(integration.lastSyncAt).toLocaleString("es-ES")}
        </p>
      )}

      <NelvyonDsButton
        size="sm"
        variant={isConnected ? "ghost" : "primary"}
        onClick={() => onConnect(integration.id)}
        className="w-full"
      >
        {isConnected ? "Desconectar" : "Conectar"}
      </NelvyonDsButton>
    </NelvyonDsCard>
  );
}

export default function SaasIntegracionesPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(STATIC_PROVIDERS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/oauth/status");
      if (res.ok) {
        const data = (await res.json()) as OAuthStatus;
        if (data.connections?.length) {
          setIntegrations(prev =>
            prev.map(p => {
              const live = data.connections.find(c => c.provider === p.provider);
              return live ? { ...p, ...live } : p;
            })
          );
        }
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleConnect(id: string) {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;
    if (integration.status === "connected") {
      if (!confirm(`¿Desconectar ${integration.displayName}?`)) return;
      await fetch(`/api/v1/oauth/disconnect/${id}`, { method: "POST" }).catch(() => {});
      void load();
      return;
    }
    try {
      const res = await fetch(`/api/v1/oauth/authorize/${id}`);
      const data = (await res.json().catch(() => ({}))) as { authorizeUrl?: string; error?: string };
      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        alert(data.error ?? "Primero añade las variables de entorno necesarias en Railway.");
      }
    } catch {
      alert("Añade las variables de entorno en Railway antes de conectar esta integración.");
    }
  }

  const connected = integrations.filter(i => i.status === "connected").length;

  return (
    <DashboardLayout sidebar={<SaasSidebar activeId="settings" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Integraciones"
          subtitle="Conecta Nelvyon con las herramientas que ya usas"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Disponibles", value: integrations.length },
            { label: "Conectadas", value: connected },
            { label: "Pendientes", value: integrations.length - connected },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/30" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {INTEGRATION_CATEGORIES.map(cat => {
              const catIntegrations = integrations.filter(i => cat.providers.includes(i.provider));
              if (catIntegrations.length === 0) return null;
              return (
                <div key={cat.label}>
                  <p className="mb-3 text-sm font-semibold text-muted-foreground">{cat.icon} {cat.label}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {catIntegrations.map(i => (
                      <IntegrationCard key={i.id} integration={i} onConnect={handleConnect} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
