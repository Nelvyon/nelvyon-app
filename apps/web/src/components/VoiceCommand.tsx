"use client";

import { Loader2, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient } from "@/core/api";
import { cn } from "@/core/ui/utils";
import { toastError, toastInfo } from "@/core/ui/toastFeedback";

type VoiceState = "idle" | "recording" | "processing" | "done";

interface VoiceAction {
  action?: string;
  route?: string;
  module?: string;
  metric?: string;
  params?: Record<string, unknown>;
}

interface TranscribeResult {
  transcript?: string;
  action?: VoiceAction;
  response?: string;
  status?: string;
}

const DONE_MS = 2200;

export function VoiceCommand() {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>("idle");
  const [tooltip, setTooltip] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, [cleanupStream]);

  const resetToIdle = useCallback(() => {
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    doneTimerRef.current = setTimeout(() => {
      setState("idle");
      setTooltip(null);
    }, DONE_MS);
  }, []);

  const sendAudio = useCallback(
    async (blob: Blob) => {
      setState("processing");
      const fd = new FormData();
      fd.append("audio", blob, "voice-command.webm");
      try {
        const result = await apiClient.postMultipart<TranscribeResult>("/api/voice-commands/transcribe", fd, {
          tenantScoped: true,
        });
        const transcript = result.transcript?.trim() || "";
        const action = result.action ?? {};
        setTooltip(transcript ? `Entendido: ${transcript}` : "Comando procesado");
        setState("done");

        if (result.status === "error") {
          toastError(result.response || "No se pudo procesar el comando");
          resetToIdle();
          return;
        }

        if (action.action === "navigate" && action.route) {
          router.push(action.route);
          toastInfo(`Navegando…`, transcript || undefined);
        } else if (action.action === "query" && result.response) {
          toastInfo(result.response, "Respuesta");
        } else if (action.action === "create" && action.module === "campaigns") {
          const name = String(action.params?.name ?? "");
          router.push(name ? `/dashboard/campanas?name=${encodeURIComponent(name)}` : "/dashboard/campanas");
          toastInfo(name ? `Creando campaña «${name}»` : "Abriendo campañas");
        } else if (transcript) {
          toastInfo(transcript, "Comando de voz");
        }

        resetToIdle();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al transcribir";
        toastError(msg);
        setState("idle");
        setTooltip(null);
      }
    },
    [router, resetToIdle],
  );

  const startRecording = useCallback(async () => {
    if (state === "recording" || state === "processing") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        cleanupStream();
        if (blob.size > 0) {
          sendAudio(blob);
        } else {
          setState("idle");
        }
      };
      recorder.start();
      setState("recording");
      setTooltip("Escuchando… suelta para enviar");
    } catch {
      toastError("No se pudo acceder al micrófono");
      setState("idle");
    }
  }, [state, cleanupStream, sendAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    }
  }, []);

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
      {tooltip ? (
        <div className="max-w-[240px] rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-lg">
          {tooltip}
        </div>
      ) : null}

      <button
        aria-label={state === "recording" ? "Soltar para enviar" : "Mantén pulsado para hablar"}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform",
          state === "recording"
            ? "scale-110 bg-destructive text-destructive-foreground animate-pulse"
            : state === "processing"
              ? "bg-primary text-primary-foreground"
              : state === "done"
                ? "bg-emerald-600 text-white"
                : "bg-primary text-primary-foreground hover:scale-105",
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          startRecording();
        }}
        onMouseUp={stopRecording}
        onMouseLeave={() => {
          if (state === "recording") stopRecording();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          startRecording();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stopRecording();
        }}
        type="button"
      >
        {state === "processing" ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        ) : (
          <Mic className="h-6 w-6" aria-hidden />
        )}

        {state === "recording" ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="h-3 w-0.5 rounded-full bg-white/80 animate-pulse"
                style={{ animationDelay: `${i * 120}ms`, height: `${8 + (i % 3) * 6}px` }}
              />
            ))}
          </span>
        ) : null}
      </button>
    </div>
  );
}
