"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface CallLog {
  id: string; contactName: string; phone: string;
  direction: "outbound" | "inbound"; status: "completed" | "no_answer" | "busy" | "failed";
  duration: number; notes: string | null; createdAt: string;
}

function DialerPad({ onCall }: { onCall: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [calling, setCalling] = useState(false);

  function press(d: string) {
    if (phone.length < 15) setPhone(p => p + d);
  }

  async function call() {
    if (!phone.trim()) return;
    setCalling(true);
    try { await onCall(phone); }
    finally { setCalling(false); }
  }

  const KEYS = ["1","2","3","4","5","6","7","8","9","*","0","#"];

  return (
    <NelvyonDsCard className="p-5">
      <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Marcador</p>
      <div className="mb-3 rounded-xl bg-background border border-border px-4 py-3 text-center font-mono text-xl text-foreground min-h-[52px]">
        {phone || <span className="text-muted-foreground/50">Número…</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {KEYS.map(k => (
          <button key={k} onClick={() => press(k)}
            className="rounded-xl border border-border py-3 text-lg font-medium text-foreground hover:bg-muted/30 transition-colors">
            {k}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setPhone(p => p.slice(0, -1))}
          className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ⌫
        </button>
        <NelvyonDsButton onClick={call} disabled={!phone.trim() || calling} className="flex-[2]">
          {calling ? "Llamando…" : "📞 Llamar"}
        </NelvyonDsButton>
      </div>
    </NelvyonDsCard>
  );
}

export default function SaasDialerPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [twilioOk, setTwilioOk] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/dialer/calls");
      if (res.status === 503) { setTwilioOk(false); return; }
      setTwilioOk(true);
      const data = (await res.json().catch(() => ({ calls: [] }))) as { calls: CallLog[] };
      setCalls(data.calls ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCall(phone: string) {
    const res = await fetch("/api/v1/dialer/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) alert(data.error ?? "Error al llamar");
    else void load();
  }

  function fmtDur(sec: number) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "primary"> = {
    completed: "success", no_answer: "warning", busy: "warning", failed: "danger"
  };
  const STATUS_LABEL: Record<string, string> = {
    completed: "Completada", no_answer: "Sin respuesta", busy: "Ocupado", failed: "Fallida"
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="crm" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader title="Dialer — Llamadas" subtitle="Realiza llamadas salientes a tus contactos directamente desde Nelvyon" />

        {twilioOk === false && (
          <NelvyonDsCard className="border-yellow-500/30 bg-yellow-500/5 p-5">
            <p className="font-medium text-yellow-400">Twilio no configurado</p>
            <p className="mt-1 text-sm text-muted-foreground">Añade estas variables en Railway para activar llamadas:</p>
            <p className="mt-2 font-mono text-xs text-primary">TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN · TWILIO_PHONE_NUMBER</p>
          </NelvyonDsCard>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="flex flex-col gap-4">
            <DialerPad onCall={handleCall} />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Llamadas hoy", value: calls.filter(c => new Date(c.createdAt).toDateString() === new Date().toDateString()).length },
                { label: "Duración media", value: calls.length > 0 ? fmtDur(Math.round(calls.reduce((s, c) => s + c.duration, 0) / calls.length)) : "—" },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Historial de llamadas</p>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />)}</div>
            ) : calls.length === 0 ? (
              <NelvyonDsCard className="p-12 text-center">
                <p className="text-4xl">📞</p>
                <p className="mt-3 text-muted-foreground text-sm">Sin llamadas aún. Usa el marcador para empezar.</p>
              </NelvyonDsCard>
            ) : (
              <div className="space-y-2">
                {calls.map(c => (
                  <NelvyonDsCard key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.contactName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.phone} · {c.direction === "outbound" ? "↗ Saliente" : "↙ Entrante"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{fmtDur(c.duration)}</span>
                      <NelvyonDsBadge tone={STATUS_TONE[c.status] ?? "primary"}>{STATUS_LABEL[c.status] ?? c.status}</NelvyonDsBadge>
                    </div>
                  </NelvyonDsCard>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SaasShellLayout>
  );
}
