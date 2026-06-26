"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Minimal typing for the Web Speech API (not in lib.dom for all targets).
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Status = "idle" | "listening" | "denied" | "unsupported";

export function SaasVoiceCommand() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [toast, setToast] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!getRecognitionCtor()) setStatus("unsupported");
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const handleTranscript = useCallback(
    async (transcript: string) => {
      try {
        const res = await fetch("/api/saas/voice/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, source: "web_speech" }),
        });
        if (!res.ok) {
          showToast("No pude procesar el comando");
          return;
        }
        const d = (await res.json()) as {
          success: boolean; route: string | null; message: string;
          intent?: { action?: string } | null;
        };
        if (d.success && d.route) {
          showToast(d.message);
          const action = d.intent?.action;
          // For action intents, pass a hint the target page can pick up.
          const url = action ? `${d.route}${d.route.includes("?") ? "&" : "?"}voice=${action}` : d.route;
          router.push(url);
        } else {
          showToast(d.message || "Comando no reconocido");
        }
      } catch {
        showToast("Error de red al procesar la voz");
      }
    },
    [router],
  );

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      showToast("Tu navegador no soporta reconocimiento de voz");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "es-ES";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) void handleTranscript(transcript);
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setStatus("denied");
        showToast("Permiso de micrófono denegado");
      } else {
        showToast("No te he oído, inténtalo de nuevo");
      }
    };
    recognition.onend = () => setStatus((s) => (s === "denied" ? s : "idle"));
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setStatus("listening");
    } catch {
      setStatus("idle");
    }
  }, [handleTranscript]);

  function toggle() {
    if (status === "listening") {
      recognitionRef.current?.stop();
      setStatus("idle");
    } else {
      startListening();
    }
  }

  // Unsupported browsers: render nothing (no broken FAB).
  if (status === "unsupported") return null;

  return (
    <>
      <button
        aria-label="Comando de voz"
        onClick={toggle}
        className={`fixed z-50 flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl shadow-lg transition-all ${
          status === "listening"
            ? "border-red-500/50 bg-red-500/20 text-red-300 animate-pulse"
            : status === "denied"
              ? "border-white/10 bg-white/5 text-white/30"
              : "border-[#0084ff]/40 bg-[#0084ff]/15 text-[#0084ff] hover:bg-[#0084ff]/25"
        }`}
        style={{
          right: "max(1rem, env(safe-area-inset-right, 1rem))",
          bottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))",
        }}
        title={status === "denied" ? "Micrófono bloqueado" : "Pulsa y habla: «ir a CRM»"}
      >
        <span aria-hidden="true" className="text-lg">{status === "listening" ? "🔴" : "🎙️"}</span>
      </button>

      {status === "denied" && (
        <div className="fixed bottom-20 right-4 z-50 max-w-xs rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-[11px] text-yellow-200">
          Activa el micrófono en los permisos del navegador para usar los comandos de voz.
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 right-4 z-50 rounded-xl bg-[#0084ff] px-4 py-2 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
