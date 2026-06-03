import { nelvyonServiciosCapacidades } from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";

function SolutionCard({
  title,
  problem,
  solution,
  result,
}: {
  title: string;
  problem: string;
  solution: string;
  result: string;
}) {
  return (
    <article className="flex flex-col rounded-3xl border border-white/12 bg-[#07111F] p-7 md:p-9">
      <h4 className="text-lg font-medium text-white md:text-xl">{title}</h4>
      <div className="mt-7 grid grid-cols-1 gap-6 border-t border-white/8 pt-7 md:grid-cols-3 md:gap-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Problema habitual</p>
          <p className="mt-2 text-sm leading-7 text-white/68 md:text-[15px]">{problem}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0084FF]/80">
            Solución NELVYON
          </p>
          <p className="mt-2 text-sm leading-7 text-white/78 md:text-[15px]">{solution}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Resultado esperado</p>
          <p className="mt-2 text-sm leading-7 text-white/68 md:text-[15px]">{result}</p>
        </div>
      </div>
    </article>
  );
}

export function ServiciosCapacidades() {
  return (
    <section className="w-full border-t border-white/10 py-20 md:py-32">
      <Container className="flex flex-col gap-20 md:gap-28">
        <div className="max-w-3xl">
          <Header>{nelvyonServiciosCapacidades.title}</Header>
          <p className="-tracking-xs mt-6 text-base leading-8 text-white/75 md:text-lg">
            {nelvyonServiciosCapacidades.intro}
          </p>
        </div>

        <div className="flex flex-col gap-24 md:gap-32">
          {nelvyonServiciosCapacidades.categories.map((category, categoryIndex) => (
            <article key={category.id} className="flex flex-col gap-10 md:gap-12">
              <div
                className={`rounded-3xl border p-8 md:p-10 ${
                  categoryIndex % 2 === 0
                    ? "border-[#0084FF]/30 bg-gradient-to-br from-[#0084FF]/10 via-[#0047AB]/5 to-transparent"
                    : "border-white/12 bg-[#020817]/80"
                }`}
              >
                <div className="flex flex-wrap items-end gap-4 md:gap-6">
                  <span className="text-4xl font-semibold tabular-nums leading-none text-[#0084FF]/35 md:text-5xl">
                    {String(categoryIndex + 1).padStart(2, "0")}
                  </span>
                  <h3 className="-tracking-sm text-2xl font-medium text-white md:text-4xl">
                    {category.title}
                  </h3>
                </div>
                <p className="mt-5 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
                  {category.intro}
                </p>
              </div>

              <div className="flex flex-col gap-6 md:gap-8">
                {category.items.map((item) => (
                  <SolutionCard key={item.title} {...item} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
