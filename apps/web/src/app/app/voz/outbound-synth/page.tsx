"use client";

import { useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { canPerformAction } from "@/core/routing/guards";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useVoiceV2Governance, useVoiceV2SynthConsume } from "@/features/voice/hooks";
import { validateSynthText, VOICE_SYNTH_MAX_CHARS } from "@/features/voice/synthPolicy";

/** VOZ v2 Flow 2 — device speechSynthesis after server quota tick (no server TTS). */
export default function VoiceV2OutboundSynthPage() {
  const { user } = useAuth();
  const canConsume = user ? canPerformAction(user.role, "voice", "edit") : false;
  const gov = useVoiceV2Governance();
  const consume = useVoiceV2SynthConsume();
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);

  const g = gov.data;
  const blocked = !g?.plan_allowed || (g.actions_remaining ?? 0) < 1;

  const onPlay = async () => {
    setLocalError(null);
    setPlayed(false);
    const v = validateSynthText(text);
    if (!v.ok) {
      setLocalError(v.error);
      return;
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setLocalError("Speech synthesis is not available in this browser.");
      return;
    }
    if (!canConsume || blocked) return;
    try {
      await consume.mutateAsync(v.text.length);
    } catch (e) {
      if (e instanceof ApiError) setLocalError(e.message);
      else setLocalError("Could not reserve a synth slot.");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(v.text);
    u.onend = () => setPlayed(true);
    u.onerror = () => setLocalError("Playback was interrupted.");
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Browser synth (listen)</h2>
          <Badge tone="neutral">VOZ v2 pilot</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Voz sintética generada por tu dispositivo; la calidad depende de tu navegador/SO. No es todavía el producto final de
          voz NELVYON. Sin IVR, colas, campañas ni almacenamiento de audio en servidor: solo lectura local tras reservar un
          cupo de piloto.
        </p>
      </header>

      {!canConsume ? (
        <p className="text-sm text-warning-foreground">Your role cannot use synth preview (workspace operator required).</p>
      ) : null}

      {gov.isLoading ? <p className="text-sm text-muted-foreground">Checking pilot allowance…</p> : null}
      {blocked && g ? (
        <ErrorNotice>
          <p>
            {g.plan_allowed
              ? "Monthly pilot action limit reached."
              : "Voice pilot is not enabled for this workspace plan (server allowlist)."}
          </p>
        </ErrorNotice>
      ) : null}

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
        <label className="block text-sm font-medium text-foreground" htmlFor="voz-synth-text">
          Text (max {VOICE_SYNTH_MAX_CHARS} characters)
        </label>
        <textarea
          id="voz-synth-text"
          className="min-h-[120px] w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={!canConsume || blocked || consume.isPending}
          maxLength={VOICE_SYNTH_MAX_CHARS}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {text.trim().length} / {VOICE_SYNTH_MAX_CHARS} (trimmed length validated on play)
        </p>
        {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
        <Button disabled={!canConsume || blocked || consume.isPending} type="button" onClick={() => void onPlay()}>
          {consume.isPending ? "Reserving…" : "Generar escucha"}
        </Button>
        {played ? <p className="text-xs text-muted-foreground">Playback finished (or cancelled in the browser).</p> : null}
      </section>
    </div>
  );
}
