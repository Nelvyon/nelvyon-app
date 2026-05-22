"use client";

import { useCallback, useRef, useState } from "react";

import { fetchTtsBase64, playBase64Mp3 } from "@/lib/voiceApi";

type AgentListenButtonProps = {
  text: string;
  voiceId?: string;
  className?: string;
  disabled?: boolean;
};

export function AgentListenButton({
  text,
  voiceId,
  className = "",
  disabled = false,
}: AgentListenButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const onListen = useCallback(async () => {
    if (!text.trim() || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const { audio_base64 } = await fetchTtsBase64(text, voiceId);
      audioRef.current = playBase64Mp3(audio_base64);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo reproducir el audio";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loading, text, voiceId]);

  const isDisabled = disabled || !text.trim() || loading;

  return (
    <span className={`inline-flex flex-col items-end gap-1 ${className}`.trim()}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => void onListen()}
        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-sky-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title="Escuchar con ElevenLabs"
      >
        {loading ? "Generando voz…" : "Escuchar"}
      </button>
      {error ? <span className="max-w-[200px] text-right text-[10px] text-rose-400">{error}</span> : null}
    </span>
  );
}
