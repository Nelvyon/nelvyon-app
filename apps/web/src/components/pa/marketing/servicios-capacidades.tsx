import { nelvyonServiciosCapacidades } from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";

export function ServiciosCapacidades() {
  return (
    <section className="w-full border-t border-white/8 py-12 md:py-20">
      <Container className="flex flex-col gap-12 md:gap-16">
        <div className="max-w-3xl">
          <Header>{nelvyonServiciosCapacidades.title}</Header>
          <p className="-tracking-xs mt-4 text-base leading-7 text-white/75">
            {nelvyonServiciosCapacidades.intro}
          </p>
        </div>

        <div className="flex flex-col gap-12 md:gap-14">
          {nelvyonServiciosCapacidades.categories.map((category) => (
            <div key={category.id} className="flex flex-col gap-5">
              <div className="border-b border-white/8 pb-4">
                <h3 className="-tracking-sm text-xl font-medium text-white">{category.title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">{category.intro}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-[#07111F] p-5 transition hover:border-[#0084FF]/30"
                  >
                    <h4 className="text-sm font-medium text-white">{item.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-white/65">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
