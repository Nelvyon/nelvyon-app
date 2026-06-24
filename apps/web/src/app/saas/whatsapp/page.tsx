"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface WaMessage {
  id: string;
  to: string;
  body: string;
  status: "sent" | "failed";
  createdAt: string;
}

interface WaStatus {
  whatsapp_configured: boolean;
  provider: "meta" | "twilio" | null;
  from_number: string | null;
  phone_number_id: string | null;
  messages: WaMessage[];
}

function SendModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) { setError("El teléfono es obligatorio"); return; }
    if (!body.trim()) { setError("El mensaje es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), body: body.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Error al enviar");
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo mensaje WhatsApp</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Teléfono destino *</label>
            <input
              type="tel"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+34612345678"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">Formato internacional: +34612345678</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Mensaje *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Hola, te escribimos desde..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{body.length} caracteres</p>
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Enviando…" : "Enviar"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasWhatsAppPage() {
  const [data, setData] = useState<WaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/whatsapp?limit=50");
      if (res.ok) {
        const j = (await res.json()) as WaStatus;
        setData(j);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="whatsapp" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="WhatsApp Business"
            subtitle="Envía mensajes de WhatsApp a tus contactos desde Nelvyon"
          />
          <NelvyonDsButton onClick={() => setShowSend(true)} disabled={!data?.whatsapp_configured}>
            + Nuevo mensaje
          </NelvyonDsButton>
        </div>

        {!loading && data && !data.whatsapp_configured && (
          <NelvyonDsCard className="border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="font-medium text-yellow-400">⚠️ WhatsApp no configurado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Opción A (Meta Cloud API):{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">META_WA_PHONE_NUMBER_ID</code> +{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">META_WA_ACCESS_TOKEN</code>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Opción B (Twilio fallback):{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">TWILIO_ACCOUNT_SID</code> +{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">TWILIO_AUTH_TOKEN</code> +{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">TWILIO_FROM_WHATSAPP</code>
            </p>
          </NelvyonDsCard>
        )}

        {!loading && data?.whatsapp_configured && (
          <NelvyonDsCard className="border-green-500/30 bg-green-500/5 p-4">
            <p className="text-sm text-green-400">
              ✅ WhatsApp activo vía{" "}
              <span className="font-semibold uppercase">{data.provider ?? "?"}</span>
              {data.provider === "meta" && data.phone_number_id && (
                <> — Phone Number ID:{" "}
                  <code className="rounded bg-muted/50 px-1 text-xs">{data.phone_number_id}</code>
                </>
              )}
              {data.provider === "twilio" && data.from_number && (
                <> — desde{" "}
                  <code className="rounded bg-muted/50 px-1 text-xs">{data.from_number}</code>
                </>
              )}
            </p>
          </NelvyonDsCard>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Enviados", value: data?.messages.filter(m => m.status === "sent").length ?? 0 },
            { label: "Fallidos", value: data?.messages.filter(m => m.status === "failed").length ?? 0 },
            { label: "Total", value: data?.messages.length ?? 0 },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />)}
          </div>
        ) : !data?.messages.length ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">💬</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin mensajes</p>
            <p className="mt-2 text-sm text-muted-foreground">Envía tu primer mensaje de WhatsApp</p>
            {data?.whatsapp_configured && (
              <NelvyonDsButton className="mt-5" onClick={() => setShowSend(true)}>+ Nuevo mensaje</NelvyonDsButton>
            )}
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-2">
            {data.messages.map((m) => (
              <NelvyonDsCard key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">{m.to}</span>
                      <NelvyonDsBadge tone={m.status === "sent" ? "success" : "danger"}>
                        {m.status === "sent" ? "Enviado" : "Fallido"}
                      </NelvyonDsBadge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString("es-ES")}
                  </span>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>

      {showSend && <SendModal onClose={() => setShowSend(false)} onSent={load} />}
    </SaasShellLayout>
  );
}
