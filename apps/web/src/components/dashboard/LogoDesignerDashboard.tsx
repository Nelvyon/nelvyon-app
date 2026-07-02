"use client";

import { useCallback, useEffect, useState } from "react";

type LogoStyle = "modern" | "classic" | "minimalist" | "bold" | "playful";

type LogoDesignerInput = {
  brandName: string;
  industry: string;
  style: LogoStyle;
  colors?: string[];
  description?: string;
};

type LogoGenerateResult = {
  imageUrl: string;
  prompt: string;
  revisedPrompt: string;
};

type SavedLogo = {
  id: string;
  brandName: string;
  input: LogoDesignerInput;
  imageUrl: string;
  prompt: string;
  revisedPrompt: string | null;
  createdAt: string;
};

const STYLES: { id: LogoStyle; label: string }[] = [
  { id: "modern", label: "Moderno" },
  { id: "classic", label: "Clásico" },
  { id: "minimalist", label: "Minimalista" },
  { id: "bold", label: "Audaz" },
  { id: "playful", label: "Lúdico" },
];

const PRESET_COLORS = ["#6366f1", "#0ea5e9", "#22c55e", "#eab308", "#f97316", "#ec4899", "#ffffff", "#94a3b8"];

export default function LogoDesignerDashboard() {
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState<LogoStyle>("modern");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [colorDraft, setColorDraft] = useState("");
  const [variants, setVariants] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [gallery, setGallery] = useState<SavedLogo[]>([]);
  const [latestResults, setLatestResults] = useState<LogoGenerateResult[]>([]);

  const loadGallery = useCallback(async () => {
    const res = await fetch("/api/os/agents/logo-designer");
    if (!res.ok) throw new Error("load_failed");
    const data = (await res.json()) as { logos: SavedLogo[] };
    setGallery(data.logos ?? []);
  }, []);

  useEffect(() => {
    loadGallery().catch(() => setStatus("No se pudo cargar la galería"));
  }, [loadGallery]);

  function addColorFromDraft(): void {
    const v = colorDraft.trim();
    if (!v) return;
    if (!colors.includes(v)) setColors((c) => [...c, v]);
    setColorDraft("");
  }

  function addPreset(hex: string): void {
    if (!colors.includes(hex)) setColors((c) => [...c, hex]);
  }

  function removeColor(hex: string): void {
    setColors((c) => c.filter((x) => x !== hex));
  }

  async function downloadImage(url: string, filename: string): Promise<void> {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function generate(): Promise<void> {
    if (!brandName.trim() || !industry.trim()) {
      setStatus("Marca e industria son obligatorios");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const payload: LogoDesignerInput = {
        brandName: brandName.trim(),
        industry: industry.trim(),
        style,
        colors: colors.length > 0 ? colors : undefined,
        description: description.trim() || undefined,
      };
      const res = await fetch("/api/os/agents/logo-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, variants }),
      });
      if (!res.ok) throw new Error("generate_failed");
      const data = (await res.json()) as { results: LogoGenerateResult[] };
      setLatestResults(data.results ?? []);
      await loadGallery();
      setStatus(variants ? "Se generaron 3 variantes" : "Logo generado");
    } catch {
      setStatus("Error al generar el logo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Logo Designer OS</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Describe tu marca y obtén logos profesionales con IA (DALL·E 3), listos para descargar.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr]">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">Brief</h2>
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="text-slate-400">Nombre de marca</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-500/40 focus:ring-2"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ej. Acme Labs"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Industria</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-500/40 focus:ring-2"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Ej. Software B2B"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Estilo</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-500/40 focus:ring-2"
                  value={style}
                  onChange={(e) => setStyle(e.target.value as LogoStyle)}
                >
                  {STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Descripción (opcional)</span>
                <textarea
                  className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-500/40 focus:ring-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Valores, público, tono..."
                />
              </label>

              <div>
                <span className="text-sm text-slate-400">Colores</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      className="h-8 w-8 rounded-full border border-slate-600 shadow-inner transition hover:scale-105"
                      style={{ backgroundColor: c }}
                      onClick={() => addPreset(c)}
                    />
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="#hex o nombre"
                    value={colorDraft}
                    onChange={(e) => setColorDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColorFromDraft())}
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                    onClick={addColorFromDraft}
                  >
                    Añadir
                  </button>
                </div>
                {colors.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-xs text-slate-200 hover:border-red-500/50"
                        onClick={() => removeColor(c)}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-slate-500"
                          style={{ backgroundColor: c.startsWith("#") ? c : "transparent" }}
                        />
                        {c}
                        <span className="text-slate-500">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  checked={variants}
                  onChange={(e) => setVariants(e.target.checked)}
                />
                <span className="text-sm text-slate-300">Generar 3 variantes</span>
              </label>

              <button
                type="button"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500 disabled:opacity-50"
                onClick={() => void generate()}
              >
                {loading ? "Generando…" : "Generar logo"}
              </button>
              {status && <p className="text-center text-sm text-slate-400">{status}</p>}
            </div>
          </section>

          <section className="space-y-10">
            {latestResults.length > 0 && (
              <div>
                <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">Resultados</h2>
                <div className="grid gap-6 sm:grid-cols-1 xl:grid-cols-2">
                  {latestResults.map((r, idx) => (
                    <article
                      key={`${r.imageUrl}-${idx}`}
                      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-lg"
                    >
                      <div className="relative aspect-square w-full bg-slate-950">
                        { }
                        <img src={r.imageUrl} alt={`Variante ${idx + 1}`} className="h-full w-full object-contain p-4" />
                      </div>
                      <div className="space-y-3 border-t border-slate-800 p-4">
                        <p className="text-xs leading-relaxed text-slate-400">
                          <span className="font-medium text-slate-300">Prompt: </span>
                          {r.prompt}
                        </p>
                        {r.revisedPrompt !== r.prompt && (
                          <p className="text-xs leading-relaxed text-slate-500">
                            <span className="font-medium text-slate-400">Revisado: </span>
                            {r.revisedPrompt}
                          </p>
                        )}
                        <button
                          type="button"
                          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                          onClick={() => void downloadImage(r.imageUrl, `logo-${brandName || "marca"}-${idx + 1}.png`)}
                        >
                          Descargar imagen
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">Galería</h2>
              {gallery.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
                  Aún no hay logos guardados. Genera el primero con el formulario.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.map((logo) => (
                    <article
                      key={logo.id}
                      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-md transition hover:border-slate-600"
                    >
                      <div className="relative aspect-square bg-slate-950">
                        { }
                        <img src={logo.imageUrl} alt={logo.brandName} className="h-full w-full object-contain p-3" />
                      </div>
                      <div className="space-y-2 p-3">
                        <p className="truncate text-sm font-medium text-white">{logo.brandName}</p>
                        <p className="text-xs text-slate-500">{new Date(logo.createdAt).toLocaleString()}</p>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2 text-xs text-slate-200 hover:bg-slate-700"
                          onClick={() => void downloadImage(logo.imageUrl, `logo-${logo.brandName}-${logo.id.slice(0, 8)}.png`)}
                        >
                          Descargar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
