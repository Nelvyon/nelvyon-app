"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

import { getBrandMode } from "@/core/platform/brand";
import { isPathAllowed } from "@/core/platform/surfacePolicy";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ForbiddenNotice } from "@/core/ui/pageStatus";
import { trackProductEvent } from "@/core/telemetry/productEvents";
import { HELP_MODULES, HelpModule, getHelpModuleTitle } from "@/features/help/content";
import { searchHelpArticles } from "@/features/help/search";

export default function HelpModulePage() {
  const params = useParams<{ module: string }>();
  const moduleKey = params?.module ?? "";
  const isClientMode = getBrandMode() === "client";
  const clientAllowed = ["inbox", "campaigns"];
  const moduleAllowed = isClientMode ? clientAllowed.includes(moduleKey) : true;

  if (!HELP_MODULES.includes(moduleKey as HelpModule)) {
    return (
      <ProtectedLayout module="help">
        <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          Unknown help module. Go back to{" "}
          <Link className="text-link underline" href="/help">
            Help center
          </Link>
          .
        </p>
      </ProtectedLayout>
    );
  }
  if (!moduleAllowed) {
    return (
      <ProtectedLayout module="help">
        <ForbiddenNotice title="Module not available">
          <p>This support module is not enabled for your portal access.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Next: use inbox or projects modules, or contact your account owner if you need additional coverage.
          </p>
        </ForbiddenNotice>
      </ProtectedLayout>
    );
  }

  const moduleName = moduleKey as HelpModule;
  const items = searchHelpArticles("", moduleName).filter((article) => (isClientMode ? clientAllowed.includes(article.module) : true));

  return (
    <ProtectedLayout module="help">
      <div className="space-y-4">
        <header className="rounded-lg border border-border bg-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Help module</p>
          <h2 className="text-base font-semibold text-foreground">{getHelpModuleTitle(moduleName)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            FAQ + how-to + first steps for {getHelpModuleTitle(moduleName).toLowerCase()}.
          </p>
        </header>
        <ul className="space-y-3">
          {items.map((article) => (
            <li className="rounded-md border border-border bg-card p-4 shadow-card" key={article.id}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{article.kind}</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">{article.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{article.body}</p>
              <Link
                className="mt-2 inline-flex text-xs text-link underline"
                href={isClientMode && !isPathAllowed(article.href, "client") ? `/help/${article.module}` : article.href}
                onClick={() => trackProductEvent("help_article_opened", { module: article.module, route: article.href })}
              >
                {isClientMode && !isPathAllowed(article.href, "client") ? "Open module root" : "Open related screen"}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ProtectedLayout>
  );
}
