"use client";

import { useState } from "react";

type CreativeAssetPayload = {
  id: string;
  assetType: "image" | "video";
  provider: "midjourney" | "kling" | "dalle";
  prompt: string;
  url: string | null;
  status: "pending" | "done" | "failed";
};

const accent = "#f43f5e";

function providerLabel(p: CreativeAssetPayload["provider"]): string {
  if (p === "midjourney") return "Midjourney";
  if (p === "kling") return "Kling";
  return "DALL·E";
}

export default function CreativeStudio() {
  const [mode, setMode] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asset, setAsset] = useState<CreativeAssetPayload | null>(null);

  async function generate(): Promise<void> {
    const p = prompt.trim();
    if (!p) {
      setError("Escribe un prompt");
      return;
    }
    setLoading(true);
    setError("");
    setAsset(null);
    try {
      const res = await fetch("/api/os/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: mode, prompt: p }),
      });
      if (!res.ok) throw new Error("request_failed");
      const data = (await res.json()) as { asset: CreativeAssetPayload };
      setAsset(data.asset);
    } catch {
      setError("No se pudo generar el contenido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <h2 className="text-lg font-semibold" style={{ color: accent }}>
        Creative Studio
      </h2>
      <p className="mt-1 text-sm text-zinc-400">Generación automática de imagen (Midjourney → DALL·E) o vídeo (Kling).</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-sm font-medium ${mode === "image" ? "text-white" : "border border-zinc-700 text-zinc-400"}`}
          style={mode === "image" ? { backgroundColor: accent } : undefined}
          onClick={() => setMode("image")}
        >
          Imagen
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-sm font-medium ${mode === "video" ? "text-white" : "border border-zinc-700 text-zinc-400"}`}
          style={mode === "video" ? { backgroundColor: accent } : undefined}
          onClick={() => setMode("video")}
        >
          Vídeo
        </button>
      </div>

      <textarea
        className="mt-3 min-h-[100px] w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        placeholder="Describe la imagen o el vídeo que quieres crear…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: accent }}
          onClick={() => void generate()}
        >
          {loading ? (
            <>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
              Generando…
            </>
          ) : (
            "Generar"
          )}
        </button>
        {error ? <span className="text-sm text-red-400">{error}</span> : null}
      </div>

      {asset ? (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: accent }}
            >
              {providerLabel(asset.provider)}
            </span>
            <span className="text-xs text-zinc-500">{asset.status}</span>
          </div>
          {asset.status === "done" && asset.url ? (
            asset.assetType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={asset.prompt} className="max-h-[480px] w-auto max-w-full rounded-lg border border-zinc-800" />
            ) : (
              <video src={asset.url} className="max-h-[480px] w-full max-w-3xl rounded-lg border border-zinc-800" autoPlay loop muted playsInline controls />
            )
          ) : (
            <p className="text-sm text-zinc-400">No hay preview disponible.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
