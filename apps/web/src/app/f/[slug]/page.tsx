/**
 * Public funnel page: /f/[slug]
 * Renders step-by-step funnel with A/B variant support.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

type FunnelStep = {
  id: string; type: string; name: string;
  content: string | null; ctaLabel: string | null; ctaUrl: string | null;
};
type FunnelInfo = {
  id: string; name: string; description: string | null;
  publicSlug: string; steps: FunnelStep[]; totalSteps: number;
};
type StepData = {
  stepOrder: number; totalSteps: number;
  step: FunnelStep & { content: string | null };
  variant: { key: string; id: string } | null;
  nextStepUrl: string | null; isLast: boolean;
};

function generateSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "nelvyon_session";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = generateSessionId();
  sessionStorage.setItem(key, id);
  return id;
}

export default function PublicFunnelPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params?.slug ?? "";

  const [funnel, setFunnel] = useState<FunnelInfo | null>(null);
  const [stepData, setStepData] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sessionId] = useState<string>(() =>
    typeof window !== "undefined" ? getOrCreateSessionId() : ""
  );

  const currentOrder = parseInt(searchParams?.get("step") ?? "1", 10);

  const loadStep = useCallback(async (order: number, slug: string, sid: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/public/funnel/${slug}/step/${order}?session=${encodeURIComponent(sid)}`,
      );
      if (!res.ok) { setNotFound(true); return; }
      const data = (await res.json()) as StepData;
      setStepData(data);

      // Record visit event
      void fetch(`/api/public/funnel/${slug}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "visit",
          stepId: data.step.id,
          sessionId: sid,
          variantKey: data.variant?.key ?? null,
        }),
      });
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, []);

  // Load funnel info on mount
  useEffect(() => {
    if (!slug) return;
    void fetch(`/api/public/funnel/${slug}`)
      .then(r => r.ok ? r.json() as Promise<FunnelInfo> : Promise.reject())
      .then(data => setFunnel(data))
      .catch(() => setNotFound(true));
  }, [slug]);

  // Load step whenever order changes
  useEffect(() => {
    if (!slug || !sessionId) return;
    void loadStep(currentOrder, slug, sessionId);
  }, [slug, currentOrder, sessionId, loadStep]);

  function goToStep(order: number) {
    router.push(`/f/${slug}?step=${order}`, { scroll: true });
  }

  function handleCta() {
    if (!stepData) return;
    const ctaUrl = stepData.step.ctaUrl;

    // Record conversion
    void fetch(`/api/public/funnel/${slug}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "conversion",
        stepId: stepData.step.id,
        sessionId,
        variantKey: stepData.variant?.key ?? null,
      }),
    });

    if (ctaUrl) {
      if (ctaUrl.startsWith("/") || ctaUrl.startsWith("http")) {
        window.location.href = ctaUrl;
      } else {
        window.location.href = ctaUrl;
      }
    } else if (!stepData.isLast) {
      goToStep(currentOrder + 1);
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817]">
        <div className="text-center">
          <p className="text-5xl">🔍</p>
          <h1 className="mt-4 text-2xl font-bold text-white">Página no encontrada</h1>
          <p className="mt-2 text-white/50">Este funnel no existe o ya no está disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      {/* Progress bar */}
      {stepData && stepData.totalSteps > 1 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/[0.06]">
          <div
            className="h-full bg-[#0084ff] transition-all duration-500"
            style={{ width: `${(currentOrder / stepData.totalSteps) * 100}%` }}
          />
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-16 pt-20">
        {/* Step indicator */}
        {stepData && stepData.totalSteps > 1 && (
          <div className="mb-6 flex items-center justify-center gap-2">
            {Array.from({ length: stepData.totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${i + 1 === currentOrder ? "bg-[#0084ff]" : i + 1 < currentOrder ? "bg-[#0084ff]/40" : "bg-white/[0.1]"}`}
              />
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-3/4 rounded-lg bg-white/[0.05]" />
            <div className="h-4 w-full rounded-lg bg-white/[0.03]" />
            <div className="h-4 w-5/6 rounded-lg bg-white/[0.03]" />
            <div className="h-12 w-48 rounded-xl bg-white/[0.05] mt-8" />
          </div>
        ) : stepData ? (
          <div className="space-y-8">
            {/* Step name */}
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{stepData.step.name}</h1>

            {/* Content HTML */}
            {stepData.step.content ? (
              <div
                className="prose prose-invert max-w-none text-white/80"
                dangerouslySetInnerHTML={{ __html: stepData.step.content }}
              />
            ) : (
              <p className="text-white/40 italic">Sin contenido configurado para este paso.</p>
            )}

            {/* Funnel name / context */}
            {funnel && (
              <p className="text-xs text-white/20 mt-2">
                {funnel.name} · Paso {currentOrder} de {stepData.totalSteps}
              </p>
            )}

            {/* CTA */}
            <div className="pt-4">
              {stepData.step.ctaLabel || !stepData.isLast ? (
                <button
                  onClick={handleCta}
                  className="rounded-xl bg-[#0084ff] px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0084ff]/50 focus:ring-offset-2 focus:ring-offset-[#020817]"
                >
                  {stepData.step.ctaLabel ?? (stepData.isLast ? "Finalizar" : "Siguiente →")}
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-6 py-4">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-emerald-400">¡Completado!</p>
                    <p className="text-sm text-white/50">Has completado este funnel.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation: back */}
            {currentOrder > 1 && (
              <button
                onClick={() => goToStep(currentOrder - 1)}
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                ← Paso anterior
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
