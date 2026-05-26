"use client";

import { useEffect, useRef, useState } from "react";

import { FadeIn } from "./FadeIn";
import { BRAND } from "./shared";

const STATS = [
  { value: 193, suffix: "+", label: "Sectores atendidos" },
  { value: 25, suffix: "", label: "Servicios incluidos" },
  { value: 48, suffix: "h", label: "Tiempo de respuesta", noCount: true as const },
  { value: 100, suffix: "%", label: "IA en cada servicio" },
] as const;

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      {display.toLocaleString("es-ES")}
      {suffix}
    </>
  );
}

export function LandingStats() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      setAnimate(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 py-16 md:py-20"
      style={{ backgroundColor: "#0a0f1e" }}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {STATS.map((s, i) => (
            <FadeIn delay={i * 0.05} key={s.label}>
              <div
                className="rounded-2xl border p-6 text-center transition duration-200 hover:scale-[1.02] hover:border-[#0066FF]"
                style={{ backgroundColor: BRAND.bg, borderColor: BRAND.cardBorder }}
              >
                <p className="text-[48px] font-extrabold leading-none tabular-nums text-[#00CFFF]">
                  {"noCount" in s && s.noCount ? (
                    <>
                      {s.value}
                      {s.suffix}
                    </>
                  ) : !inView ? (
                    <>
                      0
                      {s.suffix}
                    </>
                  ) : animate ? (
                    <CountUp suffix={s.suffix} value={s.value} />
                  ) : (
                    <>
                      {s.value.toLocaleString("es-ES")}
                      {s.suffix}
                    </>
                  )}
                </p>
                <p className="mt-2 text-sm text-[#94A3B8]">{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
