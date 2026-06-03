import { nelvyonAboutFull } from "@/config/nelvyon-marketing-pages";
import { nelvyonPageCtas } from "@/config/nelvyon-pa-content";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { Button } from "@/components/pa/button";
import { PaDashboardMock } from "@/components/pa/marketing/pa-dashboard-mock";

export function AboutFull() {
  return (
    <section className="bg-natural-black text-natural-white w-full border-t border-white/10 py-20 md:py-32">
      <Container className="flex flex-col gap-24 md:gap-28">
        <div className="max-w-3xl">
          <Header>{nelvyonAboutFull.porQueExiste.title}</Header>
          <p className="mt-6 text-lg leading-7 text-white/75">{nelvyonAboutFull.porQueExiste.body}</p>
        </div>

        <div className="rounded-3xl border border-[#0084FF]/35 bg-gradient-to-r from-[#0047AB]/25 to-[#07111F] px-8 py-10 md:px-12 md:py-14">
          <p className="text-xl font-medium leading-8 text-white md:text-2xl md:leading-9">
            {nelvyonAboutFull.fraseFuerte}
          </p>
        </div>

        <div>
          <Header>{nelvyonAboutFull.loQueNoHacemos.title}</Header>
          <ul className="mt-8 flex flex-col gap-3">
            {nelvyonAboutFull.loQueNoHacemos.items.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-2xl border border-white/10 bg-[#07111F] px-5 py-4 text-base leading-6 text-white/85"
              >
                <span className="shrink-0 text-[#0084FF]">×</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-lg leading-7 text-white/75">
            {nelvyonAboutFull.loQueNoHacemos.cierre}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
          <PaDashboardMock featured title="Panel operativo NELVYON" badge="Operación conectada" />
          <div className="flex flex-col gap-6">
            <Header>Historia</Header>
            <p className="text-lg leading-7 text-white/75">{nelvyonAboutFull.historia}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-[#0084FF]/35 bg-gradient-to-br from-[#0084FF]/10 to-[#07111F] p-8 md:p-10">
            <span className="text-xs font-medium uppercase tracking-wider text-[#0084FF]">
              Misión
            </span>
            <p className="mt-4 text-base leading-7 text-white/80 md:text-lg">{nelvyonAboutFull.mision}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#07111F] p-8 md:p-10">
            <span className="text-xs font-medium uppercase tracking-wider text-white/55">
              Visión
            </span>
            <p className="mt-4 text-base leading-7 text-white/80 md:text-lg">{nelvyonAboutFull.vision}</p>
          </div>
        </div>

        <div>
          <Header>Valores</Header>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nelvyonAboutFull.valores.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/10 bg-[#07111F] p-6"
              >
                <h4 className="font-medium text-white">{v.title}</h4>
                <p className="mt-2 text-sm leading-6 text-white/70">{v.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#07111F] p-8 md:p-12">
          <h3 className="-tracking-sm text-2xl font-medium text-white">Filosofía</h3>
          <p className="mt-4 max-w-3xl text-lg leading-7 text-white/75">
            {nelvyonAboutFull.filosofia}
          </p>
        </div>

        <div>
          <Header>Cómo trabajamos</Header>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {nelvyonAboutFull.comoTrabajamos.map((s) => (
              <div key={s.step} className="rounded-2xl border border-white/10 bg-[#020817] p-6">
                <span className="text-sm font-medium text-[#0084FF]">{s.step}</span>
                <h4 className="mt-2 font-medium text-white">{s.title}</h4>
                <p className="mt-2 text-sm leading-6 text-white/70">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Header>Qué diferencia a NELVYON</Header>
          <ul className="mt-8 flex flex-col gap-4">
            {nelvyonAboutFull.diferencia.map((d) => (
              <li
                key={d}
                className="flex gap-3 rounded-2xl border border-[#0084FF]/20 bg-[#07111F] px-6 py-4 text-base leading-6 text-white/85"
              >
                <span className="shrink-0 text-[#0084FF]">→</span>
                {d}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-[#0084FF]/30 bg-[#0084FF]/10 p-8 md:p-10">
          <Button variant="primary" text={nelvyonPageCtas.nosotros} href="/contacto" />
        </div>
      </Container>
    </section>
  );
}
