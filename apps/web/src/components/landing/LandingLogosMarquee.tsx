import type { ReactNode } from "react";

import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";
import { INTEGRATION_LOGOS } from "./marketingLogos";

function LogoPill({ name, icon }: { name: string; color: string; icon: ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-semibold text-white"
      style={{
        borderColor: "rgba(255,255,255,0.1)",
        backgroundColor: "#0A0A0A",
      }}
    >
      {icon}
      {name}
    </span>
  );
}

export function LandingLogosMarquee() {
  const row = [...INTEGRATION_LOGOS, ...INTEGRATION_LOGOS];

  return (
    <section
      className="border-y py-12 md:py-16"
      style={{
        backgroundColor: BRAND.bgSoft,
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <p
            className="mb-8 text-center text-sm font-medium uppercase tracking-widest"
            style={{ color: BRAND.textDim }}
          >
            Conectado con las herramientas que ya usas
          </p>
        </FadeIn>
      </div>
      <div className="relative overflow-hidden">
        <div className="nelvyon-marquee flex gap-6 whitespace-nowrap px-4">
          {row.map((logo, i) => (
            <LogoPill color={logo.color} icon={logo.icon} key={`${logo.name}-${i}`} name={logo.name} />
          ))}
        </div>
      </div>
    </section>
  );
}
