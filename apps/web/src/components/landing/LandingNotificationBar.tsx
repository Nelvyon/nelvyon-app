import Link from "next/link";

import { BRAND } from "./shared";

export function LandingNotificationBar() {
  return (
    <div
      className="relative z-[60] flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-center text-sm text-white"
      style={{ backgroundColor: BRAND.blue }}
    >
      <span>🚀 Agencia de marketing digital con tecnología IA — Resultados en semanas</span>
      <Link
        className="rounded-full bg-white px-4 py-1 text-xs font-semibold transition hover:bg-zinc-100"
        href="/contacto"
        style={{ color: BRAND.blue }}
      >
        Solicitar propuesta
      </Link>
    </div>
  );
}
