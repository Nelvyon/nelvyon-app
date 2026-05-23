"use client";

import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardAiApi } from "@/features/dashboard/api";
import { DashboardTabs } from "@/features/dashboard/components/DashboardTabs";

const TABS = [
  { id: "texto", label: "Texto" },
  { id: "imagenes", label: "Imágenes" },
  { id: "voz", label: "Voz" },
  { id: "video", label: "Video" },
  { id: "musica", label: "Música" },
];

export default function IaDashboardPage() {
  const [tab, setTab] = useState("texto");
  const [prompt, setPrompt] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);

  const loadImageHistory = useCallback(async () => {
    const res = await dashboardAiApi.imageHistory();
    setHistory(res.items ?? []);
  }, []);

  useEffect(() => {
    if (tab === "imagenes") {
      loadImageHistory().catch(() => setHistory([]));
    }
  }, [tab, loadImageHistory]);

  async function generateText() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await dashboardAiApi.chatSimple(prompt, chatHistory);
      const text = res.reply ?? res.content ?? "";
      setReply(text);
      setChatHistory((prev) => [...prev, { role: "user", content: prompt }, { role: "assistant", content: text }]);
      setPrompt("");
    } finally {
      setLoading(false);
    }
  }

  async function generateImage() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await dashboardAiApi.generateImage(prompt);
      setImageUrl(res.url ?? res.image_url ?? null);
      loadImageHistory();
    } finally {
      setLoading(false);
    }
  }

  async function synthesizeVoice() {
    if (!voiceText.trim()) return;
    setLoading(true);
    try {
      await dashboardAiApi.voiceSynth(voiceText);
      setReply("Audio sintetizado (revisa la respuesta del servidor).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">IA Creativa</h1>
          <p className="text-sm text-muted-foreground">Texto, imágenes, voz, video y música</p>
        </div>

        <DashboardTabs active={tab} onChange={setTab} tabs={TABS} />

        {tab === "texto" ? (
          <div className="space-y-4">
            <textarea
              className="w-full rounded-lg border px-3 py-2"
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Escribe tu prompt…"
              rows={4}
              value={prompt}
            />
            <Button disabled={loading || !prompt.trim()} onClick={generateText}>
              {loading ? "Generando…" : "Generar texto"}
            </Button>
            {reply ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm whitespace-pre-wrap">{reply}</div>
            ) : null}
          </div>
        ) : null}

        {tab === "imagenes" ? (
          <div className="space-y-4">
            <textarea
              className="w-full rounded-lg border px-3 py-2"
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe la imagen…"
              rows={3}
              value={prompt}
            />
            <Button disabled={loading || !prompt.trim()} onClick={generateImage}>
              {loading ? "Generando…" : "Generar imagen"}
            </Button>
            {imageUrl ? (
              <div className="rounded-xl border p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Generada" className="max-h-96 rounded-lg" src={imageUrl} />
              </div>
            ) : null}
            {history.length ? (
              <div className="rounded-xl border p-4">
                <h3 className="mb-2 font-semibold">Historial</h3>
                <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(history, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "voz" ? (
          <div className="space-y-4">
            <textarea
              className="w-full rounded-lg border px-3 py-2"
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Texto para sintetizar…"
              rows={4}
              value={voiceText}
            />
            <Button disabled={loading || !voiceText.trim()} onClick={synthesizeVoice}>
              {loading ? "Sintetizando…" : "Sintetizar voz"}
            </Button>
            {reply ? <p className="text-sm text-muted-foreground">{reply}</p> : null}
          </div>
        ) : null}

        {tab === "video" ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Generación de video próximamente. Usa el módulo de video del OS para proyectos avanzados.
          </div>
        ) : null}

        {tab === "musica" ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Generación de música próximamente. Integración con proveedores de audio en desarrollo.
          </div>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
