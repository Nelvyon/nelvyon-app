"use client";

import { useEffect, useState } from "react";

type FeedbackType = "bug" | "feature" | "praise" | "other";

const TYPE_OPTIONS: { id: FeedbackType; label: string }[] = [
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature" },
  { id: "praise", label: "Elogio" },
  { id: "other", label: "Otro" },
];

export function FeedbackButton() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urlContext, setUrlContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (!cancelled) setAuthed(res.ok);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openModal = () => {
    setOpen(true);
    setDone(false);
    setError(null);
    if (typeof window !== "undefined") {
      setUrlContext(window.location.pathname);
    }
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Título y descripción son obligatorios");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), body: body.trim(), urlContext }),
      });
      if (res.status === 401) throw new Error("Sesión requerida");
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Error al enviar");
      }
      setDone(true);
      setTitle("");
      setBody("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (authed !== true) return null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="fixed left-0 top-1/2 z-40 -translate-y-1/2 origin-left -rotate-90 cursor-pointer rounded-r-lg bg-[#01696F] px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-95"
        style={{ transformOrigin: "left center" }}
      >
        Feedback
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              ✕
            </button>

            <h2 className="pr-8 text-lg font-semibold text-slate-900">Enviar feedback</h2>

            {done ? (
              <p className="mt-4 text-sm font-medium text-emerald-700">¡Recibido! Gracias.</p>
            ) : (
              <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setType(opt.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        type === opt.id
                          ? "border-[#01696F] bg-[#01696F] text-white"
                          : "border-slate-300 text-slate-700 hover:border-[#01696F]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Título breve"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Describe tu feedback"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submit()}
                  className="w-full rounded-lg bg-[#01696F] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Enviando…" : "Enviar"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
