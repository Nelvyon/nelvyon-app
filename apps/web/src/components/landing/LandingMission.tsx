import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";

const PILLARS = [
  { icon: "◆", title: "TODO EN UNO", desc: "SEO, ads, email y web con un solo equipo" },
  { icon: "◇", title: "IA DE VERDAD", desc: "Automatización que ejecuta, no solo informes" },
  { icon: "○", title: "SIN EQUIPO", desc: "Externaliza sin contratar departamento interno" },
] as const;

export function LandingMission() {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: BRAND.bgAlt }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <div
            className="rounded-3xl border px-6 py-16 text-center md:px-16"
            style={{ backgroundColor: BRAND.bgSoft, borderColor: BRAND.cardBorder }}
          >
            <p className="mx-auto max-w-4xl text-2xl font-semibold leading-snug text-white md:text-3xl lg:text-4xl">
              Existimos para dar a cualquier negocio acceso a herramientas de marketing de alto nivel, como
              las que usan las grandes empresas
            </p>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {PILLARS.map((p) => (
                <div key={p.title}>
                  <p className="text-2xl" style={{ color: BRAND.cyan }}>
                    {p.icon}
                  </p>
                  <h3 className="mt-3 text-lg font-bold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: BRAND.textMuted }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
