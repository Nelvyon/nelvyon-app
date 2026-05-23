"use client";

import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { funnelApi } from "@/features/builders/api";
import { SimpleModal, StatusBadge } from "@/features/builders/components/DashboardUi";
import type { Funnel } from "@/features/builders/types";

export default function FunnelsDashboard() {
  const [items, setItems] = useState<Funnel[]>([]);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState([{ name: "Landing", type: "landing" }]);

  const load = useCallback(async () => {
    const res = await funnelApi.list();
    setItems(res.items ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  async function create() {
    await funnelApi.create({ name: name || "Nuevo funnel", steps });
    setModal(false);
    setName("");
    setSteps([{ name: "Landing", type: "landing" }]);
    load();
  }

  function addStep() {
    setSteps([...steps, { name: `Paso ${steps.length + 1}`, type: "page" }]);
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Funnels</h1>
            <p className="text-sm text-muted-foreground">Embudos de conversión multi-paso</p>
          </div>
          <Button onClick={() => setModal(true)}>Nuevo funnel</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((f) => (
            <article className="rounded-xl border p-4" key={f.id}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{f.name}</h2>
                <StatusBadge status={f.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{f.step_count ?? f.steps?.length ?? 0} pasos</p>
            </article>
          ))}
        </div>
      </div>

      <SimpleModal onClose={() => setModal(false)} open={modal} title="Nuevo funnel">
        <input
          className="mb-4 w-full rounded-lg border px-3 py-2"
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del funnel"
          value={name}
        />
        <p className="mb-2 text-sm font-medium">Pasos</p>
        <ul className="mb-4 space-y-2">
          {steps.map((s, i) => (
            <li className="flex gap-2" key={i}>
              <input
                className="flex-1 rounded border px-2 py-1 text-sm"
                onChange={(e) => {
                  const next = [...steps];
                  next[i] = { ...next[i], name: e.target.value };
                  setSteps(next);
                }}
                value={s.name}
              />
            </li>
          ))}
        </ul>
        <Button className="mb-4" onClick={addStep} variant="outline">
          Añadir paso
        </Button>
        <Button className="w-full" onClick={create}>
          Crear funnel
        </Button>
      </SimpleModal>
    </ProtectedLayout>
  );
}
