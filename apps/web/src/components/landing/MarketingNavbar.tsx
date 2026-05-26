"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { BrandLogo } from "./BrandLogo";
import { NAV_LINKS, type NavActive } from "./shared";
import { PrimaryButton } from "./ui";

export function MarketingNavbar({ active }: { active?: NavActive }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const current = active ?? (pathname as NavActive);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="nelvyon-navbar sticky top-0 z-50">
      <div
        className="transition-[background,backdrop-filter] duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(0, 0, 0, 0.92)" : "#000000",
          backdropFilter: scrolled ? "blur(16px)" : "blur(8px)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <BrandLogo />
          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((item) => {
              const isActive =
                item.href === "/"
                  ? current === "/"
                  : current === item.href ||
                    (pathname?.startsWith(item.href + "/") ?? false);
              return (
                <Link
                  className={`nelvyon-nav-link-white text-sm font-medium transition-colors duration-200 ${
                    isActive ? "text-[#0066FF]" : "text-white hover:text-[#0066FF]"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link
              className="text-sm text-white/80 transition-colors duration-200 hover:text-[#0066FF]"
              href="/login"
            >
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
          <div className="bg-black px-4 py-4 md:hidden">
            {NAV_LINKS.map((item) => (
              <Link
                className="block py-2 text-white transition-colors hover:text-[#0066FF]"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 pt-4">
              <Link className="py-2 text-white/80" href="/login" onClick={() => setOpen(false)}>
                Acceder
              </Link>
              <PrimaryButton className="w-full justify-center" href="/contacto">
                Solicitar propuesta
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </div>
      <div
        aria-hidden
        className="pointer-events-none h-20 w-full"
        style={{
          background: "linear-gradient(180deg, #000000 0%, transparent 100%)",
        }}
      />
    </header>
  );
}
