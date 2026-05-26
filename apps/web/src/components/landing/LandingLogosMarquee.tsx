import type { ReactNode } from "react";

import { FadeIn } from "./FadeIn";
import { GHL_MARQUEE_LOGOS } from "./marketingLogos";

function LogoItem({ name, icon }: { name: string; icon: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-4 px-8">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center [&_svg]:h-9 [&_svg]:w-9">
        {icon}
      </span>
      <span className="text-lg font-semibold text-[#111827]">{name}</span>
    </span>
  );
}

export function LandingLogosMarquee() {
  const row = [...GHL_MARQUEE_LOGOS, ...GHL_MARQUEE_LOGOS];

  return (
    <section className="relative z-10 py-10" style={{ backgroundColor: "#ffffff" }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-[#1a1a1a]">
            Conectado con las herramientas que ya usas
          </p>
        </FadeIn>
      </div>
      <div
        className="relative overflow-hidden py-2"
        style={{
          backgroundColor: "#ffffff",
          maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div className="nelvyon-marquee flex items-center gap-4 whitespace-nowrap">
          {row.map((logo, i) => (
            <LogoItem icon={logo.icon} key={`${logo.name}-${i}`} name={logo.name} />
          ))}
        </div>
      </div>
    </section>
  );
}
