import { Brain, Layers, Users } from "lucide-react";

import { FadeIn } from "./FadeIn";

const PILLARS = [
  {
    icon: Layers,
    title: "TODO EN UNO",
    desc: "25 herramientas en una sola suscripción",
  },
  {
    icon: Brain,
    title: "IA EN EL CENTRO",
    desc: "Automatización que ejecuta, no solo sugiere",
  },
  {
    icon: Users,
    title: "SIN EQUIPO",
    desc: "Opera como una gran empresa sin contratar agencia",
  },
] as const;

export function WhyNelvyon() {
  return (
    <section className="relative z-10 py-12 md:py-16" style={{ backgroundColor: "#f0f7ff" }}>
      <FadeIn>
        <div
          className="mx-auto max-w-6xl px-6 py-12 md:px-12 md:py-14"
          style={{ backgroundColor: "#0a1628", borderRadius: 24, margin: "0 24px" }}
        >
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {PILLARS.map((p) => (
              <div className="text-center md:text-left" key={p.title}>
                <p.icon
                  aria-hidden
                  className="mx-auto md:mx-0"
                  size={48}
                  strokeWidth={1.5}
                  style={{ color: "#0066ff" }}
                />
                <h3
                  className="mt-5 font-bold text-white"
                  style={{ fontSize: 14, letterSpacing: "2px" }}
                >
                  {p.title}
                </h3>
                <p className="mt-3 leading-relaxed text-[#94a3b8]" style={{ fontSize: 15 }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
