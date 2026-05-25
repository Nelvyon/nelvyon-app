"use client";

import { Brain, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import {
  finetuningApi,
  type FinetuningJobStatus,
  type WorkspaceModelInfo,
} from "@/features/finetuning/api";

function statusLabel(status: string) {
  switch (status) {
    case "active":
    case "succeeded":
      return "Listo";
    case "running":
    case "queued":
    case "uploading":
    case "collecting":
      return "Entrenando";
    case "failed":
      return "Error";
    case "none":
      return "Sin modelo";
    default:
      return status;
  }
}

export default function AiModelPage() {
  const [modelInfo, setModelInfo] = useState<WorkspaceModelInfo | null>(null);
  const [jobStatus, setJobStatus] = useState<FinetuningJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [model, status] = await Promise.all([
        finetuningApi.model(),
        finetuningApi.status(),
      ]);
      setModelInfo(model);
      setJobStatus(status);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar estado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const isTraining =
    jobStatus?.status === "running" ||
    jobStatus?.status === "queued" ||
    jobStatus?.status === "collecting" ||
    jobStatus?.status === "uploading";

  const isReady =
    modelInfo?.is_active ||
    modelInfo?.status === "active" ||
    modelInfo?.status === "succeeded";

  useEffect(() => {
    if (!isTraining) return;
    const t = setInterval(() => refresh().catch(() => undefined), 8000);
    return () => clearInterval(t);
  }, [isTraining, refresh]);

  async function handleTrain() {
    setTraining(true);
    setError(null);
    try {
      await finetuningApi.start();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el entrenamiento");
    } finally {
      setTraining(false);
    }
  }

  const progress = jobStatus?.progress_pct ?? (isReady ? 100 : 0);
  const examples =
    jobStatus?.examples_count ??
    modelInfo?.examples_count ??
    (modelInfo?.metrics?.examples_used as number | undefined) ??
    0;
  const improvement = modelInfo?.metrics?.improvement_pct as number | undefined;

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <header className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tu modelo IA personalizado</h1>
            <p className="text-sm text-muted-foreground">
              Fine-tuning con tus campañas, chatbot, social y helpdesk de mayor rendimiento.
            </p>
          </div>
        </header>

        {isReady && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="font-medium">Modelo personalizado activo</span>
          </div>
        )}

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Estado actual</h2>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                isReady && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                isTraining && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                !isReady && !isTraining && "bg-muted text-muted-foreground",
              )}
            >
              {loading ? "Cargando…" : statusLabel(jobStatus?.status ?? modelInfo?.status ?? "none")}
            </span>
          </div>

          {isTraining && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progreso del entrenamiento</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Ejemplos usados</dt>
              <dd className="font-medium">{examples || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Último entrenamiento</dt>
              <dd className="font-medium">
                {modelInfo?.created_at
                  ? new Date(modelInfo.created_at).toLocaleDateString("es-ES")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mejora vs base</dt>
              <dd className="font-medium">
                {improvement != null ? `${improvement}% más ejemplos` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Modelo activo</dt>
              <dd className="font-medium">
                {modelInfo?.custom_model_active ? "Modelo personalizado activo" : "Modelo base (gpt-4o)"}
              </dd>
            </div>
          </dl>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={training || isTraining || loading} onClick={handleTrain}>
              {training || isTraining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrenando…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Entrenar mi modelo
                </>
              )}
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => refresh().catch(() => undefined)}
            >
              Actualizar estado
            </Button>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Se requieren al menos 10 ejemplos positivos (emails con open rate &gt; 30%, chatbot con
          satisfacción ≥ 4, posts sociales con engagement alto, tickets resueltos). El sistema puede
          reentrenar automáticamente cada 30 días si hay 50+ ejemplos nuevos.
        </p>
      </div>
    </ProtectedLayout>
  );
}
