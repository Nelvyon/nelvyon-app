"use client";

import { useCallback, useEffect, useState } from "react";

type VideoPlatform = "youtube" | "tiktok" | "instagram" | "linkedin";

type EnhanceScriptResult = {
  enhancedScript: string;
  hooks: string[];
  callToAction: string;
  suggestedHashtags: string[];
  shortVersion: string;
};

type ThumbnailResult = {
  imageUrl: string;
  prompt: string;
};

type SubtitleSegment = {
  start: number;
  end: number;
  text: string;
};

type SubtitlesResult = {
  srt: string;
  segments: SubtitleSegment[];
};

type EnhancementRow = {
  id: string;
  type: "script" | "thumbnail" | "subtitles";
  input: unknown;
  result: unknown;
  createdAt: string;
};

type TabId = "script" | "thumbnail" | "subtitles";

const PLATFORMS: { id: VideoPlatform; label: string }[] = [
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
];

export default function VideoEnhancerDashboard() {
  const [tab, setTab] = useState<TabId>("script");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<EnhancementRow[]>([]);

  const [originalScript, setOriginalScript] = useState("");
  const [scriptPlatform, setScriptPlatform] = useState<VideoPlatform>("youtube");
  const [targetDuration, setTargetDuration] = useState("");
  const [tone, setTone] = useState("");
  const [scriptResult, setScriptResult] = useState<EnhanceScriptResult | null>(null);

  const [thumbTitle, setThumbTitle] = useState("");
  const [thumbPlatform, setThumbPlatform] = useState("youtube");
  const [thumbStyle, setThumbStyle] = useState("");
  const [thumbColors, setThumbColors] = useState("");
  const [thumbResult, setThumbResult] = useState<ThumbnailResult | null>(null);

  const [transcript, setTranscript] = useState("");
  const [subsResult, setSubsResult] = useState<SubtitlesResult | null>(null);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/os/agents/video-enhancer");
    if (!res.ok) throw new Error("load_failed");
    const data = (await res.json()) as { enhancements: EnhancementRow[] };
    setHistory(data.enhancements ?? []);
  }, []);

  useEffect(() => {
    loadHistory().catch(() => setStatus("No se pudo cargar el historial"));
  }, [loadHistory]);

  async function runScript(): Promise<void> {
    if (!originalScript.trim()) {
      setStatus("Pega el guión original");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const body: Record<string, unknown> = {
        action: "script",
        originalScript: originalScript.trim(),
        platform: scriptPlatform,
      };
      const td = targetDuration.trim() ? Number(targetDuration) : NaN;
      if (Number.isFinite(td)) body.targetDuration = td;
      if (tone.trim()) body.tone = tone.trim();

      const res = await fetch("/api/os/agents/video-enhancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { result: EnhanceScriptResult };
      setScriptResult(data.result);
      await loadHistory();
      setStatus("Guión mejorado");
    } catch {
      setStatus("Error al mejorar el guión");
    } finally {
      setLoading(false);
    }
  }

  async function runThumbnail(): Promise<void> {
    if (!thumbTitle.trim() || !thumbPlatform.trim()) {
      setStatus("Título y plataforma son obligatorios");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const body: Record<string, unknown> = {
        action: "thumbnail",
        title: thumbTitle.trim(),
        platform: thumbPlatform.trim(),
      };
      if (thumbStyle.trim()) body.style = thumbStyle.trim();
      const cols = thumbColors
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (cols.length > 0) body.brandColors = cols;

      const res = await fetch("/api/os/agents/video-enhancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { result: ThumbnailResult };
      setThumbResult(data.result);
      await loadHistory();
      setStatus("Thumbnail generado");
    } catch {
      setStatus("Error al generar thumbnail");
    } finally {
      setLoading(false);
    }
  }

  async function runSubtitles(): Promise<void> {
    if (!transcript.trim()) {
      setStatus("Pega la transcripción");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/os/agents/video-enhancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subtitles", transcript: transcript.trim() }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { result: SubtitlesResult };
      setSubsResult(data.result);
      await loadHistory();
      setStatus("Subtítulos listos");
    } catch {
      setStatus("Error al generar subtítulos");
    } finally {
      setLoading(false);
    }
  }

  function downloadSrt(): void {
    if (!subsResult) return;
    const blob = new Blob([subsResult.srt], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "subtitles.srt";
    a.click();
    URL.revokeObjectURL(href);
  }

  async function downloadImage(url: string, name: string): Promise<void> {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "script", label: "Mejorar Script" },
    { id: "thumbnail", label: "Thumbnail" },
    { id: "subtitles", label: "Subtítulos" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Video Enhancer OS</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Mejora guiones con IA, genera thumbnails en DALL·E 3 y convierte transcripciones en SRT — sin editor humano.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.id ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {status && <p className="mb-4 text-center text-sm text-slate-400">{status}</p>}

        {tab === "script" && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <label className="block text-sm">
                <span className="text-slate-400">Guión original</span>
                <textarea
                  className="mt-1 min-h-[200px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={originalScript}
                  onChange={(e) => setOriginalScript(e.target.value)}
                  placeholder="Pega tu guión..."
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Plataforma</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={scriptPlatform}
                  onChange={(e) => setScriptPlatform(e.target.value as VideoPlatform)}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="text-slate-400">Duración objetivo (s)</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(e.target.value)}
                    placeholder="opcional"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-400">Tono</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="opcional"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                onClick={() => void runScript()}
              >
                {loading ? "Procesando…" : "Mejorar guión"}
              </button>
            </div>
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Resultado</h2>
              {!scriptResult ? (
                <p className="text-sm text-slate-500">Aquí verás el script mejorado, hooks y hashtags.</p>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-indigo-300">Guión mejorado</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-300">{scriptResult.enhancedScript}</p>
                  </div>
                  <div>
                    <p className="font-medium text-indigo-300">Hooks</p>
                    <ul className="mt-1 list-inside list-disc text-slate-300">
                      {scriptResult.hooks.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                  <p>
                    <span className="font-medium text-indigo-300">CTA: </span>
                    <span className="text-slate-300">{scriptResult.callToAction}</span>
                  </p>
                  <p>
                    <span className="font-medium text-indigo-300">Hashtags: </span>
                    <span className="text-slate-400">{scriptResult.suggestedHashtags.join(" ")}</span>
                  </p>
                  <div>
                    <p className="font-medium text-indigo-300">Versión corta (Reels/TikTok)</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-300">{scriptResult.shortVersion}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "thumbnail" && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <label className="block text-sm">
                <span className="text-slate-400">Título / tema</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={thumbTitle}
                  onChange={(e) => setThumbTitle(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Plataforma</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={thumbPlatform}
                  onChange={(e) => setThumbPlatform(e.target.value)}
                  placeholder="youtube, linkedin..."
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Estilo (opcional)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={thumbStyle}
                  onChange={(e) => setThumbStyle(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Colores marca (coma separada)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={thumbColors}
                  onChange={(e) => setThumbColors(e.target.value)}
                  placeholder="#6366f1, #0ea5e9"
                />
              </label>
              <button
                type="button"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                onClick={() => void runThumbnail()}
              >
                {loading ? "Generando…" : "Generar thumbnail"}
              </button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              {!thumbResult ? (
                <p className="text-sm text-slate-500">Vista previa del thumbnail 1792×1024.</p>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-lg bg-slate-950">
                    { }
                    <img src={thumbResult.imageUrl} alt="Thumbnail" className="w-full object-cover" />
                  </div>
                  <p className="text-xs text-slate-500">{thumbResult.prompt}</p>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                    onClick={() => void downloadImage(thumbResult.imageUrl, "thumbnail.png")}
                  >
                    Descargar imagen
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "subtitles" && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <label className="block text-sm">
                <span className="text-slate-400">Transcripción</span>
                <textarea
                  className="mt-1 min-h-[220px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Texto plano del vídeo..."
                />
              </label>
              <button
                type="button"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                onClick={() => void runSubtitles()}
              >
                {loading ? "Generando…" : "Generar SRT"}
              </button>
            </div>
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Preview segmentos</h2>
              {!subsResult ? (
                <p className="text-sm text-slate-500">Los tiempos y líneas aparecerán aquí.</p>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                    onClick={downloadSrt}
                  >
                    Descargar subtitles.srt
                  </button>
                  <ul className="max-h-[320px] space-y-2 overflow-y-auto text-xs text-slate-300">
                    {subsResult.segments.map((s, i) => (
                      <li key={i} className="rounded border border-slate-800 bg-slate-950/80 p-2">
                        <span className="text-slate-500">
                          {s.start.toFixed(2)}s → {s.end.toFixed(2)}s
                        </span>
                        <p className="mt-1 text-slate-200">{s.text}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        )}

        <section className="mt-14 border-t border-slate-800 pt-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">Historial</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay mejoras guardadas.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm"
                >
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs uppercase text-indigo-300">{h.type}</span>
                  <span className="text-slate-500">{new Date(h.createdAt).toLocaleString()}</span>
                  <span className="w-full truncate text-slate-400 sm:w-auto">
                    {h.type === "script" && typeof (h.input as { originalScript?: string })?.originalScript === "string"
                      ? (() => {
                          const t = (h.input as { originalScript: string }).originalScript;
                          return t.length > 80 ? `${t.slice(0, 80)}…` : t;
                        })()
                      : h.type === "thumbnail" && typeof (h.input as { title?: string })?.title === "string"
                        ? (h.input as { title: string }).title
                        : h.type === "subtitles"
                          ? "Subtítulos"
                          : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
