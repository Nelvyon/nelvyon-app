import Link from "next/link";

import { COLORS, LINKS } from "./constants";

export function LandingNotificationBar() {
  return (
    <div
      className="relative z-[60] flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-center text-sm text-white"
      style={{ backgroundColor: COLORS.primary }}
    >
      <span>🚀 Lanza tu marketing con IA — Sin agencias, sin esperas</span>
      <Link
        className="rounded-full bg-white px-4 py-1 text-xs font-semibold transition hover:bg-zinc-100"
        href={LINKS.register}
        style={{ color: COLORS.primary }}
      >
        Empieza gratis
      </Link>
    </div>
  );
}
