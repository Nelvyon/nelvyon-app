"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function StickyCtaBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 flex items-center justify-center gap-4 px-4 py-3 shadow-lg transition-transform duration-300 md:gap-6 md:px-6 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ zIndex: 9999, backgroundColor: "#0066ff" }}
    >
      <p className="hidden text-center font-bold text-white sm:block" style={{ fontSize: 18 }}>
        ¿Listo para dominar tu mercado?
      </p>
      <p className="text-center text-sm font-bold text-white sm:hidden">¿Listo para dominar tu mercado?</p>
      <Link
        className="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition hover:brightness-105"
        href="/contacto"
        style={{ backgroundColor: "#FFB800", color: "#0a1628" }}
      >
        Solicitar propuesta gratis
      </Link>
    </div>
  );
}
