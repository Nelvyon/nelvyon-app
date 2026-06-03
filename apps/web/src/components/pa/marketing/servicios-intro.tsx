import { nelvyonServiciosIntro } from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { Button } from "@/components/pa/button";
import { nelvyonPageCtas } from "@/config/nelvyon-pa-content";

export function ServiciosIntro() {
  return (
    <section className="w-full pt-28 md:pt-36">
      <Container className="flex flex-col gap-20 pb-8">
        <div className="flex max-w-3xl flex-col gap-6">
          <Header>{nelvyonServiciosIntro.title}</Header>
          <p className="text-muted-foreground -tracking-xs text-lg leading-7 font-medium">
            {nelvyonServiciosIntro.intro}
          </p>
          <Button text={nelvyonPageCtas.servicios} href="/contacto" />
        </div>
        <div>
          <h2 className="-tracking-sm mb-8 text-2xl font-medium text-white">
            {nelvyonServiciosIntro.processTitle}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {nelvyonServiciosIntro.steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-[#020817] p-6"
              >
                <span className="text-[#0084FF] text-sm font-medium">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-medium text-white">{step.title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-6">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
