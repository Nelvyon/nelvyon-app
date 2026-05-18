"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { canPerformAction } from "@/core/routing/guards";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { voiceV2Api } from "@/features/voice/api";
import { useVoiceV2Governance, useVoiceV2InboundUpload } from "@/features/voice/hooks";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_RECORD_MS = 60_000;

/** VOZ v2 Flow 1 — voice note → new ticket + stored audio (internal pilot). */
export default function VoiceV2InboundPage() {
  const { user } = useAuth();
  const canUpload = user ? canPerformAction(user.role, "voice", "edit") : false;
  const gov = useVoiceV2Governance();
  const upload = useVoiceV2InboundUpload();
  const [lastTicketId, setLastTicketId] = useState<number | null>(null);
  const [lastInboundId, setLastInboundId] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const g = gov.data;

  const revokeAudio = useCallback(() => {
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => () => revokeAudio(), [revokeAudio]);

  const loadPreview = async (inboundId: number) => {
    revokeAudio();
    try {
      const blob = await voiceV2Api.inboundAudioBlob(inboundId);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
    }
  };

  const sendFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setRecordError(`File too large (max ${MAX_FILE_BYTES} bytes).`);
      return;
    }
    const res = await upload.mutateAsync(file);
    setLastTicketId(res.ticket_id);
    setLastInboundId(res.inbound_id);
    await loadPreview(res.inbound_id);
  };

  const stopRecording = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const startRecording = async () => {
    setRecordError(null);
    if (!canUpload || !g?.plan_allowed || (g.actions_remaining ?? 0) < 1) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordError("Recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      mr.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      mr.onerror = () => {
        setIsRecording(false);
        setRecordError("Recording failed.");
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size > MAX_FILE_BYTES) {
          setRecordError("Recording exceeds maximum size; try a shorter note.");
          return;
        }
        const ext = blob.type.includes("webm") ? "webm" : "bin";
        const file = new File([blob], `voice-note.${ext}`, { type: blob.type || "audio/webm" });
        await sendFile(file);
      };
      mr.start();
      stopTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);
    } catch {
      setIsRecording(false);
      setRecordError("Microphone permission was denied or is unavailable.");
    }
  };

  const blocked = !g?.plan_allowed || (g.actions_remaining ?? 0) < 1;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Inbound voice note</h2>
          <Badge tone="neutral">VOZ v2 pilot</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Esto no es una línea telefónica en vivo: es dejar una nota de voz ligada a un ticket. Se crea un ticket nuevo por
          cada clip; máximo ~60s de grabación o archivo hasta {Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB; formatos de
          audio comunes (WAV, WebM, MP3, …). Sin llamadas salientes, IVR ni colas.
        </p>
      </header>

      {!canUpload ? (
        <p className="text-sm text-warning-foreground">Your role cannot upload voice notes (workspace operator required).</p>
      ) : null}

      {gov.isLoading ? <p className="text-sm text-muted-foreground">Checking pilot allowance…</p> : null}
      {gov.error instanceof ApiError ? (
        <ErrorNotice>
          <p>Could not load pilot governance.</p>
        </ErrorNotice>
      ) : null}
      {blocked && g ? (
        <ErrorNotice>
          <p>
            {g.plan_allowed
              ? "Monthly pilot action limit reached — try next month or raise the cap in deployment config."
              : "Voice pilot is not enabled for this workspace plan (server allowlist)."}
          </p>
        </ErrorNotice>
      ) : null}

      <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">Upload a file</h3>
        <input
          accept="audio/*,.wav,.webm,.mp3,.ogg,.opus"
          className="block text-sm text-muted-foreground"
          disabled={!canUpload || blocked || upload.isPending}
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f || !canUpload || blocked) return;
            if (f.size > MAX_FILE_BYTES) {
              setRecordError(`File too large (max ${MAX_FILE_BYTES} bytes).`);
              return;
            }
            void sendFile(f);
          }}
        />
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">Or record (browser)</h3>
        <p className="text-xs text-muted-foreground">Stops automatically after {MAX_RECORD_MS / 1000}s.</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canUpload || blocked || upload.isPending || isRecording} type="button" onClick={() => void startRecording()}>
            Start recording
          </Button>
          <Button
            disabled={!isRecording}
            type="button"
            variant="outline"
            onClick={() => {
              stopRecording();
            }}
          >
            Stop
          </Button>
        </div>
        {recordError ? <p className="text-sm text-destructive">{recordError}</p> : null}
      </section>

      {upload.error instanceof ApiError ? (
        <ErrorNotice>
          <p>{upload.error.message}</p>
        </ErrorNotice>
      ) : null}

      {upload.isPending ? <p className="text-sm text-muted-foreground">Uploading…</p> : null}

      {lastTicketId ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <p>
            Ticket{" "}
            <Link className="text-link underline" href={`/inbox/tickets/${lastTicketId}`}>
              #{lastTicketId}
            </Link>{" "}
            created with your audio attachment.
          </p>
          {lastInboundId ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">Preview (workspace-scoped download):</p>
              {audioUrl ? <audio className="w-full max-w-md" controls src={audioUrl} /> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
