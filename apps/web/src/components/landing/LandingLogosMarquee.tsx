import type { ReactNode } from "react";

import { FadeIn } from "./FadeIn";
import { INTEGRATION_LOGOS } from "./marketingLogos";

function LogoPill({ name, icon }: { name: string; icon: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-4 rounded-full bg-white px-6 py-3 font-semibold text-zinc-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center [&_svg]:h-10 [&_svg]:w-10">
        {icon}
      </span>
      <span className="text-base font-semibold" style={{ fontFamily: "var(--font-inter)" }}>
        {name}
      </span>
    </span>
  );
}

export function LandingLogosMarquee() {
  const row = [...INTEGRATION_LOGOS, ...INTEGRATION_LOGOS];

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <p
            className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-[#374151]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Conectado con las herramientas que ya usas
          </p>
        </FadeIn>
      </div>
      <div className="relative overflow-hidden">
        <div className="nelvyon-marquee flex gap-8 whitespace-nowrap px-4">
          {row.map((logo, i) => (
            <LogoPill icon={logo.icon} key={`${logo.name}-${i}`} name={logo.name} />
          ))}
        </div>
      </div>
    </section>
  );
}
