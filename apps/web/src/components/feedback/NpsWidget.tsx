"use client";

import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "nps_dismissed";

function commentPlaceholder(score: number | null): string {
  if (score === null) return "¿Qué podríamos mejorar?";
  if (score < 7) return "¿Qué no te está gustando?";
  if (score <= 8) return "¿Qué mejorarías?";
  return "¿Qué es lo que más te gusta?";
}

export function NpsWidget() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      setAuthed(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (!me.ok) {
          if (!cancelled) setAuthed(false);
          return;
        }
        if (!cancelled) setAuthed(true);
        const nps = await fetch("/api/nps", { credentials: "same-origin", cache: "no-store" });
        if (!nps.ok) {
          if (!cancelled) setShowSurvey(false);
          return;
        }
        const data = (await nps.json()) as { show: boolean };
        if (!cancelled) setShowSurvey(data.show === true);
      } catch {
        if (!cancelled) {
          setAuthed(false);
          setShowSurvey(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") sessionStorage.setItem(DISMISS_KEY, "1");
    setShowSurvey(false);
  }, []);

  const submit = async () => {
    if (score === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/nps", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Error al enviar");
      }
      setThanks(true);
      window.setTimeout(() => {
        setShowSurvey(false);
        setThanks(false);
      }, 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (authed !== true || !showSurvey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <button
          type="button"
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
          onClick={dismiss}
          aria-label="Cerrar"
        >
          ✕
        </button>

        {thanks ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold text-slate-900">
              ¡Gracias por tu feedback! Tu opinión hace NELVYON mejor cada día.
            </p>
          </div>
        ) : (
          <>
            <h2 className="pr-8 text-xl font-semibold text-slate-900">¿Cómo valorarías NELVYON?</h2>
            <p className="mt-1 text-sm text-slate-600">0 = muy improbable, 10 = muy probable que lo recomiendes</p>

            <div className="mt-6 flex flex-wrap justify-center gap-1.5">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={`flex h-9 w-9 items-center justify-center rounded border text-sm font-medium transition ${
                    score === n
                      ? "border-[#01696F] bg-[#01696F] text-white"
                      : "border-slate-300 bg-white text-slate-800 hover:border-[#01696F] hover:bg-[#01696F] hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>😞 Nada probable</span>
              <span>🤩 Muy probable</span>
            </div>

            {score !== null ? (
              <div className="mt-6 space-y-3">
                <label className="block text-sm font-medium text-slate-700">{commentPlaceholder(score)}</label>
                <textarea
                  className="min-h-[88px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={commentPlaceholder(score)}
                />
              </div>
            ) : null}

            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

            <button
              type="button"
              disabled={score === null || submitting}
              onClick={() => void submit()}
              className="mt-4 w-full rounded-lg bg-[#01696F] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

