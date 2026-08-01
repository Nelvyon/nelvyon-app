"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";

import { mainNav, megaNav, siteBrand } from "../content/siteContent";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
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
        scrolled || open
          ? "border-[var(--nv-border)] bg-[rgba(2,8,23,0.88)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-[4.25rem] md:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--nv-accent)] text-sm font-bold text-white"
          >
            N
          </span>
          <span className="truncate font-[family-name:var(--font-nv-display)] text-lg font-semibold tracking-tight text-white">
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
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-[var(--nv-muted)] hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--nv-border)] text-white lg:hidden"
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
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[var(--nv-border)] bg-[rgba(2,8,23,0.98)] lg:hidden"
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6" aria-label="Móvil">
            <div className="flex flex-col gap-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-base font-medium text-white hover:bg-white/5"
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
                      className="rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
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
