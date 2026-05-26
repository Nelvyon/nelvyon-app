import { STATS } from "./constants";
import { FadeIn } from "./FadeIn";

export function LandingStats() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-12 md:py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 md:grid-cols-4 md:px-6">
        {STATS.map((s, i) => (
          <FadeIn delay={i * 0.05} key={s.label}>
            <div className="text-center">
              <p className="text-3xl font-bold text-zinc-900 md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm uppercase tracking-wide text-zinc-500">{s.label}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
