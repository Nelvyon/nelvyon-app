"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PublicSiteShell } from "@/features/builders/components/PublicSiteShell";
import { publicFetch } from "@/features/builders/publicFetch";
import type { PublicSitePage } from "@/features/builders/types";

export default function SiteInnerPage() {
  const params = useParams<{ subdomain: string; page_slug: string }>();
  const subdomain = params?.subdomain ?? "";
  const pageSlug = params?.page_slug ?? "";
  const [page, setPage] = useState<PublicSitePage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!subdomain || !pageSlug) return;
    publicFetch<PublicSitePage>(`/site/${subdomain}/${pageSlug}`)
      .then(setPage)
      .catch(() => setError(true));
  }, [subdomain, pageSlug]);

  useEffect(() => {
    if (page?.meta?.meta_title) document.title = page.meta.meta_title;
  }, [page]);

  if (error) return <div className="p-12 text-center text-muted-foreground">Página no encontrada</div>;
  if (!page) return <div className="p-12 text-center">Cargando…</div>;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="border-b bg-muted/20 px-4 py-2 text-sm text-muted-foreground">
        <span>{page.project_name ?? subdomain}</span>
        <span className="mx-2">/</span>
        <span>{page.name ?? pageSlug}</span>
      </nav>
      <PublicSiteShell basePath={`/site/${subdomain}`} page={page} siteName={page.project_name} />
    </div>
  );
}
