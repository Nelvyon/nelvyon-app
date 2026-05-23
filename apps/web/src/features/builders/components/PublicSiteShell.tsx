"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { BlockRenderer } from "@/features/builders/components/BlockRenderer";
import type { PublicSitePage } from "@/features/builders/types";

interface PublicSiteShellProps {
  page: PublicSitePage;
  basePath: string;
  siteName?: string;
}

export function PublicSiteShell({ page, basePath, siteName }: PublicSiteShellProps) {
  const title = siteName ?? page.project_name ?? page.store_name ?? page.name ?? "Site";
  const nav = page.navigation ?? [];

  return (
    <motion.div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <motion.div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link className="text-lg font-bold tracking-tight" href={basePath}>
            {title}
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => (
              <Link
                className="text-sm text-muted-foreground transition hover:text-foreground"
                href={`${basePath}/${item.slug === "home" ? "" : item.slug}`.replace(/\/$/, "") || basePath}
                key={item.slug}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            href={`${basePath}/contacto`}
          >
            Contacto
          </Link>
        </motion.div>
      </header>

      <main>
        <BlockRenderer blocks={page.blocks ?? []} />
      </main>

      <footer className="mt-16 border-t bg-muted/30 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:px-6 md:flex-row md:justify-between">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {title}. Powered by NELVYON.</p>
          <motion.div className="flex gap-4 text-sm">
            {nav.slice(0, 4).map((item) => (
              <Link className="text-muted-foreground hover:text-foreground" href={`${basePath}/${item.slug}`} key={item.slug}>
                {item.label}
              </Link>
            ))}
          </motion.div>
        </div>
      </footer>
    </motion.div>
  );
}
