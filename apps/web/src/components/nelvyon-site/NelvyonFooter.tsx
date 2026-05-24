import Link from "next/link";

import { FOOTER, NELVYON } from "./brand";

export function NelvyonFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#050505] px-4 py-16 md:px-6">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-xl font-bold text-white">{NELVYON.name}</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">{NELVYON.slogan}</p>
          <p className="mt-6 text-xs text-zinc-600">© {new Date().getFullYear()} NELVYON. Todos los derechos reservados.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Producto</p>
          <ul className="mt-4 space-y-2">
            {FOOTER.producto.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-zinc-400 transition hover:text-[#0066FF]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Legal</p>
          <ul className="mt-4 space-y-2">
            {[...FOOTER.legal, ...FOOTER.empresa].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-zinc-400 transition hover:text-[#0066FF]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
