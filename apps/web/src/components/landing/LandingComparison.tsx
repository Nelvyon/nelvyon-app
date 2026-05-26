import { COLORS, COMPARISON_ROWS, LINKS } from "./constants";
import { FadeIn } from "./FadeIn";
import { PrimaryButton, SectionHeading } from "./ui";

export function LandingComparison() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: COLORS.bgAlt }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading light title="¿Cuánto pagarías por separado?" />
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="mt-12 overflow-x-auto rounded-2xl border" style={{ borderColor: COLORS.cardBorder }}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="px-4 py-4 font-semibold text-white">Herramienta</th>
                  <th className="px-4 py-4 font-semibold text-zinc-400">Competidor</th>
                  <th className="px-4 py-4 font-semibold text-zinc-400">Precio/mes</th>
                  <th className="px-4 py-4 font-semibold" style={{ color: COLORS.primary }}>
                    NELVYON
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr className="border-b border-white/5" key={row.tool}>
                    <td className="px-4 py-3 text-white">{row.tool}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.competitor}</td>
                    <td className="px-4 py-3 text-zinc-400">{row.price}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: COLORS.primary }}>
                      ✓
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 text-center md:flex-row md:justify-center md:gap-8">
            <p className="text-lg text-zinc-400">
              Total competidores:{" "}
              <span className="font-bold text-white line-through">€1.322/mes</span>
            </p>
            <p className="text-2xl font-bold md:text-3xl" style={{ color: COLORS.primary }}>
              NELVYON desde €97/mes
            </p>
          </div>
          <div className="mt-8 flex justify-center">
            <PrimaryButton href={LINKS.register}>Empieza por €97/mes →</PrimaryButton>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
