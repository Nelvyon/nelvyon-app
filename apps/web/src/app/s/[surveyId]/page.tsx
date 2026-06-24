"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type QuestionType = "text" | "rating" | "multiple_choice" | "checkbox" | "nps";

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  options?: string[];
  scale?: number;
}

interface PublicSurvey {
  id: string;
  name: string;
  type: string;
  questions: Question[];
}

function NpsButtons({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-colors ${
            value === i
              ? "bg-blue-600 border-blue-600 text-white"
              : i <= 6
              ? "border-red-300 text-red-600 hover:bg-red-50"
              : i <= 8
              ? "border-yellow-300 text-yellow-600 hover:bg-yellow-50"
              : "border-green-300 text-green-600 hover:bg-green-50"
          }`}
        >
          {i}
        </button>
      ))}
      <div className="w-full flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>Nada probable</span>
        <span>Muy probable</span>
      </div>
    </div>
  );
}

function StarRating({ scale = 5, value, onChange }: { scale?: number; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: scale }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`text-2xl transition-colors ${value != null && i < value ? "text-yellow-400" : "text-gray-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function PublicSurveyPage() {
  const params = useParams<{ surveyId: string }>();
  const surveyId = params?.surveyId ?? "";
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/s/${surveyId}`);
      if (!r.ok) { setError("Encuesta no disponible"); return; }
      const d = (await r.json()) as { survey: PublicSurvey };
      setSurvey(d.survey);
    } catch {
      setError("No se pudo cargar la encuesta");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey) return;
    setSubmitting(true);

    const npsQ = survey.questions.find(q => q.type === "nps");
    const ratingQ = survey.questions.find(q => q.type === "rating");
    const score = npsQ
      ? (answers[npsQ.id] as number | undefined) ?? null
      : ratingQ
      ? (answers[ratingQ.id] as number | undefined) ?? null
      : null;

    try {
      const r = await fetch(`/api/s/${surveyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, score }),
      });
      if (r.ok) { setSubmitted(true); }
      else { setError("Error al enviar. Inténtalo de nuevo."); }
    } catch {
      setError("Error de red.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando…</div>
      </main>
    );
  }

  if (error || !survey) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 shadow text-center max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-gray-600">{error ?? "Encuesta no disponible"}</p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 shadow text-center max-w-sm">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">¡Gracias!</h1>
          <p className="text-gray-500 text-sm">Tus respuestas han sido registradas.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.name}</h1>
          <p className="text-sm text-gray-400 mb-8">
            {survey.type === "nps" ? "¿Nos recomendarías a un amigo o colega?" : "Cuéntanos tu experiencia"}
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-8">
            {survey.questions.map((q) => (
              <div key={q.id} className="flex flex-col gap-3">
                <label className="font-medium text-gray-800">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {q.type === "nps" && (
                  <NpsButtons
                    value={(answers[q.id] as number | null) ?? null}
                    onChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                  />
                )}

                {q.type === "rating" && (
                  <StarRating
                    scale={q.scale ?? 5}
                    value={(answers[q.id] as number | null) ?? null}
                    onChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                  />
                )}

                {q.type === "text" && (
                  <textarea
                    required={q.required}
                    value={String(answers[q.id] ?? "")}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    rows={3}
                    className="border border-gray-200 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Escribe aquí…"
                  />
                )}

                {q.type === "multiple_choice" && q.options && (
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          required={q.required}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === "checkbox" && q.options && (
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => {
                      const selected = (answers[q.id] as string[] | undefined) ?? [];
                      return (
                        <label key={opt} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            value={opt}
                            checked={selected.includes(opt)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selected, opt]
                                : selected.filter(s => s !== opt);
                              setAnswers(prev => ({ ...prev, [q.id]: next }));
                            }}
                            className="accent-blue-600"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {submitting ? "Enviando…" : "Enviar respuesta"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Powered by Nelvyon</p>
      </div>
    </main>
  );
}
