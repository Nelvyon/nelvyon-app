"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { emailWarmupApi } from "@/features/email-warmup/api";

type Account = {
  account_id: string;
  email: string;
  deliverability_score: number;
  warmup_day: number;
  daily_limit: number;
  alert_low_score?: boolean;
  status: string;
};

export default function EmailWarmupPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [email, setEmail] = useState("ventas@empresa.com");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await emailWarmupApi.stats();
    setAccounts((res.accounts ?? []) as Account[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-slate-900">Email Warmup</h1>
      <p className="mb-4 text-sm text-slate-500">Deliverability y rotación SES</p>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cuenta@dominio.com"
            value={email}
          />
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await emailWarmupApi.start(email);
                setMsg("Warmup iniciado");
                await load();
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Error");
              } finally {
                setBusy(false);
              }
            }}
            type="button"
          >
            Iniciar warmup
          </button>
          <button
            className="rounded-lg border px-4 py-2 text-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await emailWarmupApi.rotate();
                setMsg(`Cuenta activa: ${String(r.active_email ?? "")}`);
                await load();
              } finally {
                setBusy(false);
              }
            }}
            type="button"
          >
            Rotar pool SES
          </button>
        </div>
        {msg ? <p className="text-sm text-slate-600">{msg}</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map((a) => (
            <div
              className={`rounded-xl border bg-white p-4 shadow-sm ${a.alert_low_score ? "border-amber-400" : ""}`}
              key={a.account_id}
            >
              <p className="font-medium text-slate-900">{a.email}</p>
              <p className="text-xs text-slate-500">
                Día {a.warmup_day} · límite {a.daily_limit}/día · {a.status}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                Score {a.deliverability_score}
                {a.alert_low_score ? <span className="text-sm text-amber-600"> · Alerta &lt;70</span> : null}
              </p>
              <div className="mt-2 flex h-2 overflow-hidden rounded bg-slate-100">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.min(100, a.deliverability_score)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
