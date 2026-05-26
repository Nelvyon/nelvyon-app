import { COLORS, INTEGRATIONS } from "./constants";
import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

export function LandingIntegrations() {
  const doubled = [...INTEGRATIONS, ...INTEGRATIONS];

  return (
    <section className="overflow-hidden py-16 md:py-20" style={{ backgroundColor: COLORS.bg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading light title="Se integra con tus herramientas favoritas" />
        </FadeIn>
      </div>
      <div className="relative mt-10">
        <div className="nelvyon-marquee flex gap-4 whitespace-nowrap">
          {doubled.map((name, i) => (
            <span
              className="inline-flex shrink-0 items-center rounded-full border px-6 py-3 text-sm font-medium text-zinc-300"
              key={`${name}-${i}`}
              style={{
                borderColor: COLORS.cardBorder,
                backgroundColor: COLORS.card,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
