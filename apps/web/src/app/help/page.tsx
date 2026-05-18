"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { getBrandMode } from "@/core/platform/brand";
import { isPathAllowed, isClientTicketCreateEnabled } from "@/core/platform/surfacePolicy";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { HELP_MODULES, HelpModule, getHelpModuleTitle } from "@/features/help/content";
import { SupportFormsPanel } from "@/features/help/components/SupportFormsPanel";
import { searchHelpArticles } from "@/features/help/search";

export default function HelpHomePage() {
  const isClientMode = getBrandMode() === "client";
  const allowedModules = useMemo<HelpModule[]>(
    () => (isClientMode ? (["inbox", "campaigns"] as HelpModule[]) : [...HELP_MODULES]),
    [isClientMode],
  );
  const [term, setTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const canSubmitSupport = !isClientMode || isClientTicketCreateEnabled();
  useEffect(() => {
    if (!term.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = window.setTimeout(() => setIsSearching(false), 160);
    return () => window.clearTimeout(t);
  }, [term]);
  const results = useMemo(
    () => searchHelpArticles(term).filter((article) => allowedModules.includes(article.module)),
    [allowedModules, term],
  );

  return (
    <ProtectedLayout module="help">
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-semibold text-foreground">{isClientMode ? "Support center" : "Help center"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isClientMode
              ? "Support guidance for requests and projects. Search runs locally over enabled portal articles."
              : "Short in-product docs to unblock first tasks. Search runs client-side over the bundled knowledge index."}
          </p>
          <input
            aria-label="Search help"
            className="mt-3 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search FAQ, how-to, first steps"
            value={term}
          />
          {isSearching ? <p className="mt-2 text-xs text-muted-foreground">Searching support articles…</p> : null}
        </section>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allowedModules.map((module) => (
            <Link
              className="rounded-md border border-border bg-card px-3 py-2 text-sm text-link underline-offset-2 hover:underline"
              href={`/help/${module}`}
              key={module}
            >
              {getHelpModuleTitle(module)}
            </Link>
          ))}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Results ({results.length})</h3>
          <ul className="space-y-2">
            {results.map((article) => (
              <li className="rounded-md border border-border p-3" key={article.id}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {getHelpModuleTitle(article.module)} · {article.kind}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{article.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{article.summary}</p>
                <Link
                  className="mt-2 inline-flex text-xs text-link underline"
                  href={`/help/${article.module}`}
                  onClick={() => trackProductEvent("help_article_opened", { module: article.module, route: `/help/${article.module}` })}
                >
                  Open module guide
                </Link>
                {" · "}
                <Link
                  className="mt-2 inline-flex text-xs text-link underline"
                  href={isClientMode && !isPathAllowed(article.href, "client") ? `/help/${article.module}` : article.href}
                  onClick={() => trackProductEvent("help_article_opened", { module: article.module, route: article.href })}
                >
                  {isClientMode && !isPathAllowed(article.href, "client") ? "Open module root" : "Go to action"}
                </Link>
              </li>
            ))}
            {results.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                No articles match this search. Next: simplify keywords, try &quot;request&quot; or &quot;project&quot;, or open one of the
                modules above to browse curated guidance.
              </li>
            ) : null}
          </ul>
        </section>

        {!canSubmitSupport ? (
          <p className="text-xs text-warning-foreground">
            Support forms are currently read-only for this portal access. You can still review guidance and existing requests.
          </p>
        ) : null}
        <SupportFormsPanel />
      </div>
    </ProtectedLayout>
  );
}
