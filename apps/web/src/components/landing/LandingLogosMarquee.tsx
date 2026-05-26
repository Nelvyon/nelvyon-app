import type { ReactNode } from "react";

import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";
import { INTEGRATION_LOGOS } from "./marketingLogos";

function LogoPill({ name, icon }: { name: string; icon: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm">
      {icon}
      {name}
    </span>
  );
}

export function LandingLogosMarquee() {
  const row = [...INTEGRATION_LOGOS, ...INTEGRATION_LOGOS];

  return (
    <section className="nelvyon-section-white border-y border-[#E5E7EB] bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-[#6B7280]">
            Conectado con las herramientas que ya usas
          </p>
        </FadeIn>
      </div>
      <div className="relative overflow-hidden">
        <div className="nelvyon-marquee flex gap-6 whitespace-nowrap px-4">
          {row.map((logo, i) => (
            <LogoPill icon={logo.icon} key={`${logo.name}-${i}`} name={logo.name} />
          ))}
        </div>
      </div>
    </section>
  );
}
