"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { NavbarLogo } from "./NavbarLogo";
import { BRAND, NAV_LINKS, type NavActive } from "./shared";
import { PrimaryButton } from "./ui";

export function MarketingNavbar({ active }: { active?: NavActive }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = active ?? (pathname as NavActive);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link className="text-xl font-bold tracking-tight" href="/" style={{ color: BRAND.blue }}>
          NELVYON
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((item) => {
            const isActive =
              item.href === "/"
                ? current === "/"
                : current === item.href ||
                  (pathname?.startsWith(item.href + "/") ?? false);
            return (
              <Link
                className="nelvyon-nav-link text-sm transition"
                href={item.href}
                key={item.href}
                style={{
                  color: isActive ? BRAND.blue : BRAND.textMuted,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link className="text-sm transition hover:text-white" href="/login" style={{ color: BRAND.textDim }}>
            Acceder
          </Link>
          <PrimaryButton href="/contacto">Solicitar propuesta</PrimaryButton>
        </div>
        <button
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="rounded-lg p-2 text-white md:hidden"
          onClick={() => setOpen(!open)}
          type="button"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-white/10 bg-black/95 px-4 py-4 md:hidden">
          {NAV_LINKS.map((item) => (
            <Link
              className="block py-2"
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
              style={{ color: BRAND.textMuted }}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            <Link className="py-2" href="/login" style={{ color: BRAND.textDim }}>
              Acceder
            </Link>
            <PrimaryButton className="w-full justify-center" href="/contacto">
              Solicitar propuesta
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </header>
  );
}
