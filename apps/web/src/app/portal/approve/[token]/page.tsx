"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Preview = { title?: string; action?: string; status?: string };
type Decision = "approve" | "reject";

export default function PortalApprovePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = decodeURIComponent(String(params?.token ?? ""));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/portal/approve?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setPreview(d);
      })
      .catch(() => setError("No se pudo cargar el entregable"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = useCallback(
    async (decision: Decision) => {
      const trimmed = feedback.trim();
      if (decision === "reject" && !trimmed) {
        setError("Describe qué debe cambiar antes de solicitar revisiones.");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/public/portal/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            decision,
            feedback: trimmed || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Error");
          return;
        }
        setDone(decision);
      } catch {
        setError("Error de red");
      } finally {
        setSubmitting(false);
      }
    },
    [token, feedback],
  );

  const suggestedAction: Decision =
    searchParams?.get("action") === "reject" || preview?.action === "reject"
      ? "reject"
      : "approve";

  return (
    <div className="min-h-screen bg-[#020817] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h1 className="text-xl font-semibold mb-2">Portal Nelvyon</h1>
        {loading && <p className="text-white/60">Cargando…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {done && (
          <p className="text-emerald-400">
            ✓ {done === "approve" ? "Entregable aprobado" : "Feedback registrado"}. Gracias.
          </p>
        )}
        {!loading && !done && !error && preview && (
          <>
            <p className="text-white/80 mb-2">{preview.title}</p>
            {preview.status ? (
              <p className="text-xs text-white/40 mb-4">Estado: {preview.status}</p>
            ) : null}
            <p className="text-sm text-white/50 mb-4">
              {suggestedAction === "reject"
                ? "Indica qué debe cambiar el equipo antes de confirmar."
                : "Aprueba si cumple tus expectativas o solicita cambios."}
            </p>
            <label className="block space-y-1 text-sm mb-6">
              <span className="font-medium text-white/80">
                Comentarios {suggestedAction === "reject" ? "(obligatorio)" : "(opcional)"}
              </span>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  suggestedAction === "reject"
                    ? "Describe los cambios que necesitas…"
                    : "Opcional al aprobar; obligatorio si solicitas cambios."
                }
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit("approve")}
                className="flex-1 rounded-lg bg-[#0084ff] py-3 font-medium hover:bg-[#0070dd] transition disabled:opacity-50"
              >
                {submitting ? "Enviando…" : "Aprobar"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit("reject")}
                className="flex-1 rounded-lg border border-white/20 py-3 font-medium hover:bg-white/10 transition disabled:opacity-50"
              >
                {submitting ? "Enviando…" : "Solicitar cambios"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
