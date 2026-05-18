"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AnalysisResult, TranscriptionContext, TranscriptionListItem, TranscriptionRecord } from "@nelvyon/saas";

type Tab = "nueva" | "resultado" | "historial";

const LANGS = [
  { code: "", label: "Auto" },
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
] as const;

const CONTEXT_OPTIONS: { value: TranscriptionContext; label: string }[] = [
  { value: "meeting", label: "Reunión" },
  { value: "podcast", label: "Podcast" },
  { value: "interview", label: "Entrevista" },
  { value: "lecture", label: "Clase" },
  { value: "call", label: "Llamada" },
];

function contextLabel(c: TranscriptionContext): string {
  return CONTEXT_OPTIONS.find((x) => x.value === c)?.label ?? c;
}

function sentimentBadge(s: string): { text: string; className: string } {
  if (s === "positive") return { text: "Positivo", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
  if (s === "negative") return { text: "Negativo", className: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
  return { text: "Neutral", className: "bg-slate-500/20 text-slate-300 border-slate-500/40" };
}

export default function TranscriptionDashboard() {
  const [tab, setTab] = useState<Tab>("nueva");
  const [status, setStatus] = useState("");

  const [audioUrl, setAudioUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [context, setContext] = useState<TranscriptionContext>("meeting");

  const [pasteText, setPasteText] = useState("");
  const [pasteContext, setPasteContext] = useState<TranscriptionContext>("meeting");

  const [busy, setBusy] = useState(false);

  const [record, setRecord] = useState<TranscriptionRecord | null>(null);
  const [analysisOnly, setAnalysisOnly] = useState<{ text: string; analysis: AnalysisResult } | null>(null);
  const [actionChecked, setActionChecked] = useState<Record<number, boolean>>({});

  const [historial, setHistorial] = useState<TranscriptionListItem[]>([]);

  const displayText = useMemo(() => {
    if (record) return record.transcriptText;
    if (analysisOnly) return analysisOnly.text;
    return "";
  }, [record, analysisOnly]);

  const displayAnalysis: AnalysisResult | null = useMemo(() => {
    if (record) {
      return {
        summary: record.summary,
        keyPoints: record.keyPoints,
        actionItems: record.actionItems,
        decisions: record.decisions,
        topics: record.topics,
        sentiment: record.sentiment as AnalysisResult["sentiment"],
        duration_estimate: record.durationEstimate,
      };
    }
    return analysisOnly?.analysis ?? null;
  }, [record, analysisOnly]);

  const loadHistorial = useCallback(async () => {
    const res = await fetch("/api/saas/transcription");
    if (!res.ok) return;
    const data = (await res.json()) as { items: TranscriptionListItem[] };
    setHistorial(data.items ?? []);
  }, []);

  useEffect(() => {
    if (tab === "historial") loadHistorial().catch(() => setStatus("No se pudo cargar el historial"));
  }, [tab, loadHistorial]);

  async function runTranscribe(): Promise<void> {
    setStatus("");
    setBusy(true);
    setAnalysisOnly(null);
    try {
      const res = await fetch("/api/saas/transcription/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          audioUrl: audioUrl.trim(),
          ...(language ? { language } : {}),
          context,
        }),
      });
      const data = (await res.json()) as { record?: TranscriptionRecord; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? "Error al transcribir");
        return;
      }
      if (data.record) {
        setRecord(data.record);
        setActionChecked({});
        setTab("resultado");
      }
    } finally {
      setBusy(false);
    }
  }

  async function runAnalyzePaste(): Promise<void> {
    setStatus("");
    setBusy(true);
    setRecord(null);
    try {
      const res = await fetch("/api/saas/transcription/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: pasteText.trim(), context: pasteContext }),
      });
      const data = (await res.json()) as { analysis?: AnalysisResult; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? "Error al analizar");
        return;
      }
      if (data.analysis) {
        setAnalysisOnly({ text: pasteText.trim(), analysis: data.analysis });
        setActionChecked({});
        setTab("resultado");
      }
    } finally {
      setBusy(false);
    }
  }

  async function openHistorialItem(id: string): Promise<void> {
    setStatus("");
    const res = await fetch(`/api/saas/transcription/${encodeURIComponent(id)}`, { credentials: "include" });
    const data = (await res.json()) as { record?: TranscriptionRecord; error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "No se pudo abrir");
      return;
    }
    if (data.record) {
      setRecord(data.record);
      setAnalysisOnly(null);
      setActionChecked({});
      setTab("resultado");
    }
  }

  function downloadTxt(): void {
    const blob = new Blob([displayText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcripcion-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sent = displayAnalysis ? sentimentBadge(displayAnalysis.sentiment) : null;

  return (
    <div className="min-h-[480px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">Transcripción audio / vídeo</h2>
          <p className="mt-1 text-sm text-slate-400">Whisper + análisis GPT-4o</p>
        </div>
        <div className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-1">
          {(
            [
              ["nueva", "Nueva"],
              ["resultado", "Resultado"],
              ["historial", "Historial"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === k ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {status ? <p className="mb-4 text-sm text-amber-400">{status}</p> : null}

      {tab === "nueva" ? (
        <div className="space-y-8">
          <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="mb-3 text-sm font-medium text-slate-300">Desde URL de audio</h3>
            <label className="block text-xs text-slate-500">URL del archivo de audio</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:ring-2"
              placeholder="https://…"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500">Idioma</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {LANGS.map((l) => (
                    <option key={l.code || "auto"} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500">Contexto</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={context}
                  onChange={(e) => setContext(e.target.value as TranscriptionContext)}
                >
                  {CONTEXT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              disabled={busy || !audioUrl.trim()}
              onClick={() => runTranscribe().catch(() => setStatus("Error"))}
              className="mt-4 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
            >
              {busy ? "Procesando…" : "Transcribir y analizar"}
            </button>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="mb-3 text-sm font-medium text-slate-300">Analizar texto existente</h3>
            <label className="block text-xs text-slate-500">Pega la transcripción</label>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:ring-2"
              placeholder="Texto completo…"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="mt-3 max-w-xs">
              <label className="block text-xs text-slate-500">Contexto</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={pasteContext}
                onChange={(e) => setPasteContext(e.target.value as TranscriptionContext)}
              >
                {CONTEXT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !pasteText.trim()}
              onClick={() => runAnalyzePaste().catch(() => setStatus("Error"))}
              className="mt-4 rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-40"
            >
              {busy ? "Analizando…" : "Solo análisis"}
            </button>
          </section>
        </div>
      ) : null}

      {tab === "resultado" ? (
        <div className="space-y-4">
          {!displayAnalysis && !displayText ? (
            <p className="text-sm text-slate-500">Ejecuta una transcripción o análisis desde la pestaña Nueva.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {record ? (
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                    {contextLabel(record.context)} · {record.durationEstimate || "—"}
                  </span>
                ) : null}
                {sent ? (
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${sent.className}`}>{sent.text}</span>
                ) : null}
                <button
                  type="button"
                  onClick={downloadTxt}
                  disabled={!displayText}
                  className="ml-auto rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                >
                  Descargar TXT
                </button>
              </div>

              {displayAnalysis ? (
                <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">Resumen ejecutivo</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-100">{displayAnalysis.summary}</p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {record ? "Transcripción completa" : "Texto analizado"}
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm leading-relaxed text-slate-200">
                  {displayText || "—"}
                </div>
              </div>

              {displayAnalysis ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Puntos clave</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {displayAnalysis.keyPoints.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Acciones</p>
                    <ul className="mt-2 space-y-2">
                      {displayAnalysis.actionItems.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <button
                            type="button"
                            aria-pressed={actionChecked[i]}
                            onClick={() => setActionChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              actionChecked[i]
                                ? "border-sky-500 bg-sky-600 text-white"
                                : "border-slate-600 bg-slate-950"
                            }`}
                          >
                            {actionChecked[i] ? "✓" : ""}
                          </button>
                          <span className={actionChecked[i] ? "text-slate-500 line-through" : ""}>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Decisiones</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {displayAnalysis.decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Temas</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {displayAnalysis.topics.map((t, i) => (
                        <span key={i} className="rounded-full border border-slate-600 bg-slate-950 px-2.5 py-0.5 text-xs text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === "historial" ? (
        <ul className="space-y-3">
          {historial.length === 0 ? (
            <li className="text-sm text-slate-500">No hay transcripciones guardadas.</li>
          ) : (
            historial.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => openHistorialItem(h.id).catch(() => setStatus("Error"))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-left transition hover:border-slate-600 hover:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(h.createdAt).toLocaleString()}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{contextLabel(h.context)}</span>
                    {h.durationEstimate ? <span>{h.durationEstimate}</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-200">{h.preview || "—"}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
