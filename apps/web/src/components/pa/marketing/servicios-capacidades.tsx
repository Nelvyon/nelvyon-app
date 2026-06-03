import { nelvyonServiciosCapacidades } from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";

export function ServiciosCapacidades() {
  return (
    <section className="w-full border-t border-white/8 py-16 md:py-28">
      <Container className="flex flex-col gap-16 md:gap-24">
        <div className="max-w-3xl">
          <Header>{nelvyonServiciosCapacidades.title}</Header>
          <p className="-tracking-xs mt-5 text-base leading-7 text-white/75 md:text-lg">
            {nelvyonServiciosCapacidades.intro}
          </p>
        </div>

        <div className="flex flex-col gap-20 md:gap-28">
          {nelvyonServiciosCapacidades.categories.map((category, categoryIndex) => (
            <article
              key={category.id}
              className={`flex flex-col gap-8 md:gap-10 ${
                categoryIndex % 2 === 1 ? "md:pl-6 lg:pl-12" : ""
              }`}
            >
              <div
                className={`rounded-3xl border p-6 md:p-8 ${
                  categoryIndex % 2 === 0
                    ? "border-[#0084FF]/25 bg-gradient-to-r from-[#0084FF]/8 to-transparent"
                    : "border-white/10 bg-[#07111F]/60"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-4">
                  <span className="text-3xl font-semibold tabular-nums text-[#0084FF]/40 md:text-4xl">
                    {String(categoryIndex + 1).padStart(2, "0")}
                  </span>
                  <h3 className="-tracking-sm text-2xl font-medium text-white md:text-3xl">
                    {category.title}
                  </h3>
                </div>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/70 md:text-lg">
                  {category.intro}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
                {category.items.map((item) => (
                  <div
                    key={item.title}
                    className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-white/10 bg-[#07111F] p-6 transition hover:border-[#0084FF]/35 md:min-h-[140px] md:p-8"
                  >
                    <h4 className="text-base font-medium text-white md:text-lg">{item.title}</h4>
                    <p className="mt-3 text-sm leading-7 text-white/65 md:text-base">{item.description}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
