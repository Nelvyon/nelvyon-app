"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { COLORS, LINKS } from "./constants";
import { PrimaryButton } from "./ui";

const NAV = [
  { href: "/servicios", label: "Servicios" },
  { href: "#precios", label: "Precios" },
  { href: LINKS.plataforma, label: "Plataforma" },
  { href: LINKS.contacto, label: "Contacto" },
] as const;

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link className="text-xl font-bold tracking-tight" href="/" style={{ color: COLORS.primary }}>
          NELVYON
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              className="text-sm text-zinc-300 transition hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            className="text-sm text-zinc-400 transition hover:text-white"
            href={LINKS.login}
          >
            Acceder
          </Link>
          <PrimaryButton>Empieza gratis</PrimaryButton>
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
          {NAV.map((item) => (
            <Link
              className="block py-2 text-zinc-300"
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <Link className="py-2 text-zinc-400" href={LINKS.login}>
              Acceder
            </Link>
            <PrimaryButton className="w-full text-center">Empieza gratis</PrimaryButton>
          </div>
        </div>
      ) : null}
    </header>
  );
}
