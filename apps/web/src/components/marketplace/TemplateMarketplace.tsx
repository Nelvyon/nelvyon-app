"use client";

import { useEffect, useMemo, useState } from "react";

type TemplateItem = {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  sector: string;
  type: string;
  installs: number;
};

const SECTORS = ["Todos", "Marketing", "SEO", "Social", "E-commerce", "Email", "General"] as const;
const TYPES = ["Todos", "agent", "automation", "integration"] as const;

export default function TemplateMarketplace() {
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [sector, setSector] = useState("Todos");
  const [type, setType] = useState("Todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      setLoading(true);
      setStatus("");
      try {
        const q = new URLSearchParams();
        if (sector !== "Todos") q.set("sector", sector);
        if (type !== "Todos") q.set("type", type);
        if (search.trim()) q.set("search", search.trim());
        const res = await fetch(`/api/saas/templates?${q.toString()}`);
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as { items: TemplateItem[] };
        if (mounted) setItems(data.items ?? []);
      } catch {
        if (mounted) setStatus("No se pudieron cargar las plantillas");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch(() => setStatus("No se pudieron cargar las plantillas"));
    return () => {
      mounted = false;
    };
  }, [sector, type, search]);

  async function install(templateId: string): Promise<void> {
    setStatus("");
    try {
      const res = await fetch("/api/saas/templates/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) throw new Error("install");
      setStatus("Plantilla instalada correctamente");
    } catch {
      setStatus("No se pudo instalar la plantilla");
    }
  }

  const grouped = useMemo(() => {
    return items.reduce<Record<string, TemplateItem[]>>((acc, item) => {
      if (!acc[item.sector]) acc[item.sector] = [];
      acc[item.sector].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Marketplace de Plantillas</h2>
        <p className="text-sm text-zinc-400">Instala agentes preconfigurados por sector e industria.</p>
      </header>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <select className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" value={sector} onChange={(e) => setSector(e.target.value)}>
          {SECTORS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar plantilla"
          value={search}
        />
      </div>

      {loading ? <p className="text-sm text-zinc-400">Cargando plantillas...</p> : null}

      {!loading &&
        Object.entries(grouped).map(([group, templates]) => (
          <div className="mb-5" key={group}>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">{group}</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((tpl) => (
                <article className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" key={tpl.id}>
                  <p className="text-xs uppercase text-zinc-400">{tpl.type}</p>
                  <h4 className="text-sm font-semibold">{tpl.name}</h4>
                  <p className="mt-1 text-xs text-zinc-400">{tpl.description}</p>
                  <p className="mt-2 text-xs text-zinc-500">Instalaciones: {tpl.installs}</p>
                  <button
                    className="mt-3 w-full rounded bg-indigo-700 px-3 py-1.5 text-sm hover:bg-indigo-600"
                    onClick={() => void install(tpl.id)}
                    type="button"
                  >
                    Instalar
                  </button>
                </article>
              ))}
            </div>
          </div>
        ))}

      {!loading && items.length === 0 ? <p className="text-sm text-zinc-500">No hay plantillas para estos filtros.</p> : null}
      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}
