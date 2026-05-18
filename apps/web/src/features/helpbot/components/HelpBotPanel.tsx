"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { FormEvent, useState } from "react";

import { Button } from "@/core/ui/button";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { inferHelpModuleFromPath } from "@/features/help/context";
import { answerHelpQuestion } from "@/features/helpbot/engine";
import { BotReply } from "@/features/helpbot/types";

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
      setError("Enter a question first. Next: ask about a concrete workflow, then submit again.");
      return;
    }
    setBusy(true);
    try {
      const nextReply = answerHelpQuestion(nextQuestion, pathname);
      setReply(nextReply);
      trackProductEvent("bot_result", {
        module: inferHelpModuleFromPath(pathname) ?? "unknown",
        result: nextReply.article ? "article" : "handoff",
        confidence: nextReply.confidence,
      });
    } catch {
      setError("The bot could not process this question right now. Next: retry or open Help center.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="my-4 rounded-lg border border-border bg-card p-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Help bot v1</p>
        <Button onClick={() => setOpen((v) => !v)} size="sm" type="button" variant="outline">
          {open ? "Hide" : "Ask"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Short answers from Help content + current module context. Bot v1 does not execute actions or edit data.
      </p>
      {open ? (
        <form className="mt-3 space-y-3" onSubmit={onAsk}>
          <input
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a product usage question"
            value={question}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy} type="submit">
              {busy ? "Answering…" : "Get answer"}
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
              Clear
            </Button>
          </div>
        </form>
      ) : null}

      {open && !reply && !busy && !error ? (
        <div className="mt-3 rounded-md border border-border p-3 text-xs text-muted-foreground">
          <p>Try: “How do I launch my first campaign?” or “App crashes with 500 on save”.</p>
        </div>
      ) : null}
      {busy ? <p className="mt-3 text-xs text-muted-foreground">Checking Help content and module context…</p> : null}
      {error ? (
        <p className="mt-3 text-xs text-destructive">
          {error}{" "}
          <Link className="text-link underline" href="/help">
            Open Help
          </Link>
        </p>
      ) : null}

      {reply ? (
        <div className="mt-3 space-y-2 rounded-md border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Confidence: {reply.confidence}</p>
          <p className="text-sm text-foreground">{reply.answer}</p>
          {reply.article ? (
            <p className="text-xs">
              <Link
                className="text-link underline"
                href={`/help/${reply.article.module}`}
                onClick={() => trackProductEvent("help_article_opened", { module: reply.article?.module, route: `/help/${reply.article?.module}` })}
              >
                Article: {reply.article.title}
              </Link>
              {" · "}
              <Link
                className="text-link underline"
                href={reply.article.href}
                onClick={() => trackProductEvent("help_article_opened", { module: reply.article?.module, route: reply.article?.href })}
              >
                Open action
              </Link>
            </p>
          ) : null}
          {reply.handoffHref ? (
            <p className="text-xs">
              <Link className="text-link underline" href={reply.handoffHref}>
                Open {reply.handoffKind} form in Help
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
