"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { FormEvent, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/core/ui/button";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { inferHelpModuleFromPath } from "@/features/help/context";
import { answerHelpQuestion } from "@/features/helpbot/engine";
import { BotReply } from "@/features/helpbot/types";

const SUGGESTIONS = [
  "¿Cómo consigo más leads?",
  "¿Cómo lanzo mi primera campaña?",
  "¿Dónde abro un ticket de soporte?",
];

export function HelpBotPanel() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<BotReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAsk = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const nextQuestion = question.trim();
    if (!nextQuestion) {
      setError("Escribe una pregunta concreta (por ejemplo: “¿Cómo creo un cliente?”).");
      return;
    }
    setBusy(true);
    try {
      const nextReply = answerHelpQuestion(nextQuestion, pathname);
      setReply(nextReply);
      trackProductEvent("bot_result", {
        module: inferHelpModuleFromPath(pathname) ?? "unknown",
        result: nextReply.article ? "article" : nextReply.actionHref ? "playbook" : "handoff",
        confidence: nextReply.confidence,
      });
    } catch {
      setError("No pude procesar la pregunta. Prueba de nuevo o abre el centro de ayuda.");
    } finally {
      setBusy(false);
    }
  };

  const askSuggestion = (text: string) => {
    setQuestion(text);
    setReply(answerHelpQuestion(text, pathname));
  };

  return (
    <section className="my-4 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Asistente NELVYON</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} size="sm" type="button" variant="outline">
          {open ? "Cerrar" : "Preguntar"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Respuestas orientadas a resultados: más clientes, mejores campañas y soporte más rápido. No modifica datos por ti.
      </p>
      {open ? (
        <form className="mt-3 space-y-3" onSubmit={onAsk}>
          <input
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej.: ¿Cómo registro mi primer cliente?"
            value={question}
          />
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                key={s}
                onClick={() => askSuggestion(s)}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy} type="submit">
              {busy ? "Buscando…" : "Obtener respuesta"}
            </Button>
            <Button
              onClick={() => {
                setReply(null);
                setQuestion("");
                setError(null);
              }}
              type="button"
              variant="outline"
            >
              Limpiar
            </Button>
          </div>
        </form>
      ) : null}

      {busy ? <p className="mt-3 text-xs text-muted-foreground">Analizando tu pregunta y el módulo actual…</p> : null}
      {error ? (
        <p className="mt-3 text-xs text-destructive">
          {error}{" "}
          <Link className="text-link underline" href="/help">
            Centro de ayuda
          </Link>
        </p>
      ) : null}

      {reply ? (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-background/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Confianza: {reply.confidence === "high" ? "Alta" : "Media"}
          </p>
          <p className="text-sm leading-relaxed text-foreground">{reply.answer}</p>
          {reply.actionHref && reply.actionLabel ? (
            <Button asChild size="sm">
              <Link href={reply.actionHref}>{reply.actionLabel}</Link>
            </Button>
          ) : null}
          {reply.article ? (
            <p className="text-xs">
              <Link
                className="text-link underline"
                href={`/help/${reply.article.module}`}
                onClick={() =>
                  trackProductEvent("help_article_opened", {
                    module: reply.article?.module,
                    route: `/help/${reply.article?.module}`,
                  })
                }
              >
                Guía: {reply.article.title}
              </Link>
              {" · "}
              <Link
                className="text-link underline"
                href={reply.article.href}
                onClick={() =>
                  trackProductEvent("help_article_opened", {
                    module: reply.article?.module,
                    route: reply.article?.href,
                  })
                }
              >
                Ir a la acción
              </Link>
            </p>
          ) : null}
          {reply.handoffHref ? (
            <p className="text-xs">
              <Link className="text-link underline" href={reply.handoffHref}>
                {reply.handoffKind === "bug"
                  ? "Reportar error"
                  : reply.handoffKind === "feedback"
                    ? "Enviar feedback"
                    : "Pedir ayuda humana"}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
