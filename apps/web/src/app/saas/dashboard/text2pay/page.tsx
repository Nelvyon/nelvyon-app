"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { text2payApi } from "@/features/text2pay/api";

export default function Text2PayPage() {
  const [phone, setPhone] = useState("+34600000000");
  const [amount, setAmount] = useState("99");
  const [description, setDescription] = useState("Suscripción NELVYON OS — mes 1");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [payments, setPayments] = useState<unknown[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [mock, setMock] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await text2payApi.payments("ws-client-1");
    setPayments(res.payments ?? []);
    setStats(res.stats ?? {});
    setMock(!!res.mock);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    setBusy(true);
    try {
      await text2payApi.create({
        client_id: "ws-client-1",
        lead_phone: phone,
        amount: parseFloat(amount),
        description,
        channel,
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-slate-900">Text-2-Pay</h1>
      <p className="mb-4 text-sm text-slate-500">Cobra por SMS o WhatsApp con link Stripe</p>
      {mock ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Modo mock — sin STRIPE_SECRET_KEY y/o Twilio
        </p>
      ) : null}
      <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-2">
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono lead" value={phone} />
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setAmount(e.target.value)} placeholder="Importe EUR" value={amount} />
        <input className="rounded border px-2 py-1 text-sm md:col-span-2" onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" value={description} />
        <select className="rounded border px-2 py-1 text-sm" onChange={(e) => setChannel(e.target.value as "sms" | "whatsapp")} value={channel}>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy} onClick={() => void send()} type="button">
          Enviar cobro
        </button>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-3 text-sm">
          <p className="text-xs text-slate-500">Total cobrado</p>
          <p className="text-lg font-semibold">{stats.total_collected_eur ?? 0} €</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-sm">
          <p className="text-xs text-slate-500">Conversión</p>
          <p className="text-lg font-semibold">{stats.conversion_rate_percent ?? 0}%</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-sm">
          <p className="text-xs text-slate-500">Horas hasta pago</p>
          <p className="text-lg font-semibold">{stats.avg_hours_to_pay ?? 0}h</p>
        </div>
      </div>
      <ul className="rounded-xl border bg-white p-3 text-sm">
        {payments.map((p, i) => (
          <li className="border-b py-2" key={i}>
            {JSON.stringify(p).slice(0, 160)}…
          </li>
        ))}
      </ul>
    </DashboardLayout>
  );
}
