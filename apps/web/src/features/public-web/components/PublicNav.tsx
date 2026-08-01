"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

import { mainNav, megaNav, siteBrand } from "../content/siteContent";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
    setMegaOpen(null);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background,border-color,backdrop-filter] duration-200 ${
        scrolled || open || megaOpen
          ? "border-[var(--nv-border)] bg-[rgba(255,255,255,0.92)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-[4.5rem] md:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--nv-accent)] text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,132,255,0.28)]"
          >
            N
          </span>
          <span className="truncate font-[family-name:var(--font-nv-display)] text-lg font-semibold tracking-tight text-[var(--nv-fg-strong)]">
            {siteBrand.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {mainNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "text-[var(--nv-fg-strong)]" : "text-[var(--nv-muted)] hover:text-[var(--nv-accent-deep)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <div
            className="relative"
            onMouseEnter={() => setMegaOpen("more")}
            onMouseLeave={() => setMegaOpen((v) => (v === "more" ? null : v))}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-[var(--nv-muted)] hover:text-[var(--nv-accent-deep)]"
              aria-expanded={megaOpen === "more"}
              onClick={() => setMegaOpen((v) => (v === "more" ? null : "more"))}
            >
              Más
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
            {megaOpen === "more" ? (
              <div className="absolute right-0 top-full z-50 w-[38rem] pt-3">
                <div className="nv-public-panel grid gap-4 p-5 shadow-[var(--nv-shadow-lg)] md:grid-cols-3">
                  {megaNav
                    .filter((g) => g.id === "saas" || g.id === "soluciones" || g.id === "recursos")
                    .map((group) => (
                      <div key={group.id}>
                        <p className="mb-2 px-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--nv-muted-2)]">
                          {group.title}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {group.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="rounded-lg px-2 py-2 text-sm text-[var(--nv-muted)] hover:bg-white/5 hover:text-[var(--nv-accent-deep)]"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="nv-public-btn nv-public-btn-secondary !min-h-10 !px-4 !text-sm">
            Acceder
          </Link>
          <Link href="/contacto" className="nv-public-btn nv-public-btn-primary !min-h-10 !px-4 !text-sm">
            Solicitar demo
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--nv-border)] text-[var(--nv-fg-strong)] lg:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div
          id={panelId}
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[var(--nv-border)] bg-[rgba(255,255,255,0.98)] lg:hidden"
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6" aria-label="Móvil">
            <div className="flex flex-col gap-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-base font-medium text-[var(--nv-fg-strong)] hover:bg-white/5"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {megaNav.map((group) => (
              <div key={group.id}>
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nv-muted)]">
                  {group.title}
                </p>
                <div className="flex flex-col">
                  {group.links.map((link) => (
                    <Link
                      key={`${group.id}-${link.href}`}
                      href={link.href}
                      className="rounded-xl px-3 py-2.5 text-sm text-[var(--nv-muted)] hover:bg-white/5 hover:text-[var(--nv-accent-deep)]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/login" className="nv-public-btn nv-public-btn-secondary w-full">
                Acceder al SaaS
              </Link>
              <Link href="/contacto" className="nv-public-btn nv-public-btn-primary w-full">
                Solicitar demo
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
