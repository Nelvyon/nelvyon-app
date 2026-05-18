"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "artist-bio"
  | "music-press-release"
  | "lyrics-prompt"
  | "social-media-music"
  | "spotify-pitch"
  | "fan-engagement"
  | "tour-promotion"
  | "music-video-concept"
  | "collaboration-outreach";
type Genre = "pop" | "rock" | "urbano" | "electrónica" | "indie" | "reggaeton" | "jazz" | "clásica" | "otro";
type Tone = "auténtico" | "comercial" | "underground" | "artístico";
type ReleaseType = "single" | "ep" | "álbum" | "gira";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "artist-bio", name: "Artist Bio", description: "Bio corta/media/larga" },
  { id: "music-press-release", name: "Music Press Release", description: "Comunicado profesional" },
  { id: "lyrics-prompt", name: "Lyrics Prompt", description: "Prompts y estructura lírica" },
  { id: "social-media-music", name: "Social Media Music", description: "Plan redes mensual" },
  { id: "spotify-pitch", name: "Spotify Pitch", description: "Pitch editorial streaming" },
  { id: "fan-engagement", name: "Fan Engagement", description: "Comunidad y superfans" },
  { id: "tour-promotion", name: "Tour Promotion", description: "Promoción de gira" },
  { id: "music-video-concept", name: "Music Video Concept", description: "Conceptos de videoclip" },
  { id: "collaboration-outreach", name: "Collab Outreach", description: "Outreach colaboraciones" },
];

export default function MusicDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("artist-bio");
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState<Genre>("pop");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState<Tone>("auténtico");
  const [releaseType, setReleaseType] = useState<ReleaseType>("single");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId, input: { artistName, genre, targetAudience, tone, releaseType } }),
      });
      const data = (await response.json()) as { success?: boolean; result?: { agentId: string; result: string; generatedAt: string }; error?: string };
      if (!response.ok || !data.success || !data.result) throw new Error(data.error ?? "Error procesando solicitud");
      setResult(data.result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult(): Promise<void> {
    if (!result?.result) return;
    await navigator.clipboard.writeText(result.result);
  }

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Music - Lote 16</h2>
      <p className="mb-4 text-sm text-slate-400">9 agentes para artistas, bandas y productores.</p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {AGENTS.map((agent) => (
            <button key={agent.id} type="button" onClick={() => setAgentId(agent.id)} className={`w-full rounded-lg border p-3 text-left ${agent.id === agentId ? "border-sky-500/50 bg-sky-950/30" : "border-slate-800 bg-slate-900/50"}`}>
              <p className="text-sm font-medium text-white">{agent.name}</p>
              <p className="mt-1 text-xs text-slate-400">{agent.description}</p>
            </button>
          ))}
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-200">{active.name}</p>
            <div className="grid gap-3">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Artist name" value={artistName} onChange={(e) => setArtistName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={genre} onChange={(e) => setGenre(e.target.value as Genre)}>
                <option value="pop">pop</option><option value="rock">rock</option><option value="urbano">urbano</option><option value="electrónica">electrónica</option><option value="indie">indie</option><option value="reggaeton">reggaeton</option><option value="jazz">jazz</option><option value="clásica">clásica</option><option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="auténtico">auténtico</option><option value="comercial">comercial</option><option value="underground">underground</option><option value="artístico">artístico</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={releaseType} onChange={(e) => setReleaseType(e.target.value as ReleaseType)}>
                <option value="single">single</option><option value="ep">ep</option><option value="álbum">álbum</option><option value="gira">gira</option>
              </select>
            </div>
            <button type="button" disabled={loading} onClick={() => runAgent().catch(() => setError("Error"))} className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Generando..." : "Ejecutar agente"}</button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">Resultado</p>
              <button type="button" onClick={() => copyResult().catch(() => {})} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" disabled={!result?.result}>Copiar</button>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{result?.result ? result.result : "Sin resultado todavia."}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

