import Image from "next/image";

import { COLORS, TESTIMONIALS } from "./constants";
import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop",
];

export function LandingTestimonials() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: COLORS.bg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading light title="Lo que dicen nuestros clientes" />
        </FadeIn>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn delay={i * 0.08} key={t.name}>
              <div
                className="relative rounded-2xl border p-8 pt-12"
                style={{
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.cardBorder,
                }}
              >
                <span
                  aria-hidden
                  className="absolute left-6 top-4 text-5xl font-serif leading-none opacity-40"
                  style={{ color: COLORS.primary }}
                >
                  &ldquo;
                </span>
                <p className="text-zinc-300">{t.text}</p>
                <div className="mt-6 flex items-center gap-4">
                  <Image
                    alt=""
                    className="rounded-full object-cover"
                    height={48}
                    src={AVATARS[i]}
                    width={48}
                  />
                  <div>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-sm text-zinc-500">{t.company}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
