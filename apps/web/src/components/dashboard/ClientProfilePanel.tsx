"use client";

import { useCallback, useEffect, useState } from "react";

type ClientProfileRow = {
  id: string;
  brand_name: string;
  brand_voice: string | null;
  target_audience: string | null;
  industry: string | null;
  competitors: string[] | null;
  usp: string | null;
  colors: string[] | null;
  keywords: string[] | null;
};

const accent = "#7c3aed";

function TagEditor(props: {
  label: string;
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = useCallback(() => {
    const t = draft.trim();
    if (!t || props.tags.includes(t)) return;
    props.onChange([...props.tags, t]);
    setDraft("");
  }, [draft, props]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-400">{props.label}</label>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          placeholder={props.placeholder ?? "Añadir y pulsar Enter"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded px-3 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: accent }}
          onClick={add}
        >
          Añadir
        </button>
      </div>
      {props.tags.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-2">
          {props.tags.map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-200"
            >
              {t}
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-300"
                aria-label={`Quitar ${t}`}
                onClick={() => props.onChange(props.tags.filter((x) => x !== t))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function ClientProfilePanel() {
  const [brandName, setBrandName] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [industry, setIndustry] = useState("");
  const [usp, setUsp] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ClientProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/os/client-profile");
    if (!res.ok) throw new Error("load_failed");
    const data = (await res.json()) as { profiles: ClientProfileRow[] };
    setProfiles(data.profiles ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => setStatus("No se pudieron cargar los perfiles"));
  }, [load]);

  function selectProfile(p: ClientProfileRow): void {
    setBrandName(p.brand_name);
    setBrandVoice(p.brand_voice ?? "");
    setTargetAudience(p.target_audience ?? "");
    setIndustry(p.industry ?? "");
    setUsp(p.usp ?? "");
    setCompetitors(p.competitors ?? []);
    setKeywords(p.keywords ?? []);
    setColors(p.colors ?? []);
  }

  async function save(): Promise<void> {
    if (!brandName.trim()) {
      setStatus("El nombre de marca es obligatorio");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/os/client-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName.trim(),
          brand_voice: brandVoice.trim() || null,
          target_audience: targetAudience.trim() || null,
          industry: industry.trim() || null,
          usp: usp.trim() || null,
          competitors,
          keywords,
          colors,
        }),
      });
      if (!res.ok) throw new Error("save_failed");
      await load();
      setStatus("Perfil guardado");
    } catch {
      setStatus("No se pudo guardar el perfil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <h2 className="text-lg font-semibold" style={{ color: accent }}>
        Perfil de marca
      </h2>
      <p className="mt-1 text-sm text-zinc-400">Todos tus agentes usarán este perfil automáticamente</p>

      {profiles.length > 0 ? (
        <div className="mt-3">
          <label className="text-xs font-medium text-zinc-400">Cargar perfil guardado</label>
          <select
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            onChange={(e) => {
              const id = e.target.value;
              const p = profiles.find((x) => x.id === id);
              if (p) selectProfile(p);
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar…
            </option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-zinc-400">Nombre de marca</label>
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ej. Mi marca"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-zinc-400">Voz de marca</label>
          <textarea
            className="min-h-[72px] rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            placeholder="Tono, personalidad, palabras que sí / no"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-400">Audiencia objetivo</label>
          <textarea
            className="min-h-[72px] rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="Buyer persona principal"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-400">Industria</label>
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Sector"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-zinc-400">USP</label>
          <textarea
            className="min-h-[64px] rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={usp}
            onChange={(e) => setUsp(e.target.value)}
            placeholder="Propuesta de valor única"
          />
        </div>
        <div className="md:col-span-2">
          <TagEditor label="Competidores" tags={competitors} onChange={setCompetitors} placeholder="Nombre del competidor" />
        </div>
        <div className="md:col-span-2">
          <TagEditor label="Palabras clave" tags={keywords} onChange={setKeywords} placeholder="Keyword" />
        </div>
        <div className="md:col-span-2">
          <TagEditor label="Colores (hex)" tags={colors} onChange={setColors} placeholder="#7c3aed" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading}
          className="rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: accent }}
          onClick={() => void save()}
        >
          Guardar perfil
        </button>
        {status ? <span className="text-sm text-zinc-400">{status}</span> : null}
      </div>
    </section>
  );
}
