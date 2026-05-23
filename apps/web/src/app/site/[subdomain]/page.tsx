"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PublicSiteShell } from "@/features/builders/components/PublicSiteShell";
import { publicFetch } from "@/features/builders/publicFetch";
import type { PublicSitePage } from "@/features/builders/types";

export default function SiteHomePage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params?.subdomain ?? "";
  const [page, setPage] = useState<PublicSitePage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!subdomain) return;
    publicFetch<PublicSitePage>(`/site/${subdomain}`)
      .then(setPage)
      .catch(() => setError(true));
  }, [subdomain]);

  if (error) return <div className="p-12 text-center text-muted-foreground">Sitio no encontrado</div>;
  if (!page) return <div className="p-12 text-center">Cargando…</div>;

  return <PublicSiteShell basePath={`/site/${subdomain}`} page={page} siteName={page.project_name} />;
}
