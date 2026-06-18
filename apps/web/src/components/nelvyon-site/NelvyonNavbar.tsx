"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { NAV } from "./brand";

export function NelvyonNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="nelvyon-enterprise-topbar fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-[4.5rem] md:px-6">
        <Link href="/" className="group flex items-center">
          <span className="text-xl font-bold tracking-tight text-white transition group-hover:text-[#66a3ff]">
            NELVYON
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition ${pathname === item.href ? "text-[#0066FF]" : "text-zinc-400 hover:text-white"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm text-zinc-400 transition hover:text-white">
            Acceder
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[#0066FF] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(0,102,255,0.35)] transition hover:bg-[#0052cc]"
          >
            Empieza gratis
          </Link>
        </div>

        <button
          aria-label="Menú"
          className="rounded-lg p-2 text-zinc-300 md:hidden"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            className="border-t border-white/10 bg-black px-4 py-4 md:hidden"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
          >
            <div className="flex flex-col gap-3">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="py-2 text-zinc-300" onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <Link href="/login" className="py-2 text-zinc-400" onClick={() => setOpen(false)}>
                Acceder
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#0066FF] py-3 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Empieza gratis
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
