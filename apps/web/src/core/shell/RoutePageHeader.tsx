"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { BreadcrumbTrail } from "@/core/shell/BreadcrumbTrail";
import { getBreadcrumbs } from "@/core/shell/breadcrumbTypes";
import { getRoutePageMeta } from "@/core/shell/routePageRegistry";
import { PageTitle } from "@/core/ui/typography";

export function RoutePageHeader() {
  const pathname = usePathname() ?? "";
  const meta = getRoutePageMeta(pathname);
  const crumbs = getBreadcrumbs(pathname);

  useEffect(() => {
    document.title = meta.documentTitle;
  }, [meta.documentTitle]);

  return (
    <header className="border-b border-border/80 bg-card/90 pb-4 pt-1">
      <BreadcrumbTrail items={crumbs} />
      <PageTitle>{meta.heading}</PageTitle>
      {meta.description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{meta.description}</p> : null}
    </header>
  );
}
