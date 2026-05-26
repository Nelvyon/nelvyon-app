import { COLORS, MISSION_PILLARS } from "./constants";
import { FadeIn } from "./FadeIn";

export function LandingMission() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <div
            className="rounded-3xl border px-6 py-16 text-center md:px-16"
            style={{
              backgroundColor: COLORS.bgAlt,
              borderColor: COLORS.cardBorder,
            }}
          >
            <p className="mx-auto max-w-4xl text-2xl font-semibold leading-snug text-white md:text-3xl lg:text-4xl">
              Existimos para eliminar las agencias caras y darle a cualquier negocio las
              herramientas que usan las grandes empresas
            </p>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {MISSION_PILLARS.map((p) => (
                <div key={p.title}>
                  <p className="text-2xl" style={{ color: COLORS.cyan }}>
                    {p.icon}
                  </p>
                  <h3 className="mt-3 text-lg font-bold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
