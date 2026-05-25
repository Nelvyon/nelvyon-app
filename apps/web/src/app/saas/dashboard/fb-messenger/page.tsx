"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { fbMessengerApi } from "@/features/fb-messenger/api";

type Conv = { id: string; psid: string; bot_enabled: number; last_snippet?: string };

export default function FbMessengerPage() {
  const [items, setItems] = useState<Conv[]>([]);
  const [psid, setPsid] = useState("");
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    const res = await fbMessengerApi.conversations();
    setItems((res.conversations ?? []) as Conv[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-slate-900">Facebook Messenger</h1>
      <p className="mb-4 text-sm text-slate-500">Bandeja y bot de ventas</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="max-h-96 space-y-2 overflow-y-auto rounded-xl border bg-white p-3">
          {items.map((c) => (
            <li className="rounded-lg border p-2 text-sm" key={c.id}>
              <p className="font-medium">PSID {c.psid}</p>
              <p className="text-slate-500">{c.last_snippet || "—"}</p>
              <label className="mt-1 flex items-center gap-2 text-xs">
                <input
                  checked={!!c.bot_enabled}
                  onChange={(e) => void fbMessengerApi.setBot(c.id, e.target.checked).then(load)}
                  type="checkbox"
                />
                Bot automático
              </label>
            </li>
          ))}
        </ul>
        <div className="space-y-2 rounded-xl border bg-white p-4">
          <input className="w-full rounded border px-2 py-1 text-sm" onChange={(e) => setPsid(e.target.value)} placeholder="psid" value={psid} />
          <textarea className="w-full rounded border px-2 py-2 text-sm" onChange={(e) => setText(e.target.value)} rows={4} value={text} />
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => void fbMessengerApi.send(psid, text).then(load)} type="button">
            Enviar
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
