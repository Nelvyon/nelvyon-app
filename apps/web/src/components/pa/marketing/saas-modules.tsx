import { nelvyonSaasModules } from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";

export function SaasModules() {
  return (
    <section className="w-full py-12 md:py-20">
      <Container className="flex flex-col gap-12">
        <Header>Módulos de la plataforma</Header>
        <p className="text-muted-foreground -tracking-xs max-w-3xl text-base leading-6 font-medium">
          Visión de las capacidades del dashboard NELVYON. La disponibilidad concreta depende de tu
          plan, workspace e integraciones activas.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nelvyonSaasModules.map((mod) => (
            <div
              key={mod.id}
              className="rounded-2xl border border-white/10 bg-[#020817] p-6 transition hover:border-[#0084FF]/40"
            >
              <h3 className="-tracking-sm text-lg font-medium text-white">{mod.title}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-6">{mod.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
