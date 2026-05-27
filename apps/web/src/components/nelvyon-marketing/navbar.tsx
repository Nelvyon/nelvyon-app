"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/saas", label: "SaaS" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

export function NelvyonNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8eef8] bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png.png" alt="NELVYON" width={32} height={32} className="object-contain" />
          <span className="text-base font-bold tracking-tight text-[#07122a]">NELVYON</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#07122a]/80 transition hover:text-[#1a7fc4]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#07122a] transition hover:bg-[#f8faff]"
          >
            Acceder
          </Link>
          <Link
            href="/registro"
            className="rounded-lg bg-[#1a7fc4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1569a8]"
          >
            Empieza gratis
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg border border-[#e8eef8] px-3 py-2 text-sm md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          Menú
        </button>
      </div>

      {open && (
        <div className="border-t border-[#e8eef8] bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#07122a]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="text-sm font-medium text-[#07122a]" onClick={() => setOpen(false)}>
              Acceder
            </Link>
            <Link
              href="/registro"
              className="rounded-lg bg-[#1a7fc4] px-4 py-2 text-center text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Empieza gratis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
