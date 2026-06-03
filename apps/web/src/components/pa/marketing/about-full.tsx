import Image from "next/image";

import { nelvyonAboutFull } from "@/config/nelvyon-marketing-pages";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";

export function AboutFull() {
  return (
    <section className="bg-natural-black text-natural-white w-full py-12 md:py-20">
      <Container className="flex flex-col gap-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
          <div className="relative overflow-hidden rounded-3xl">
            <Image
              src="/pa/assets/project-3.webp"
              alt="Panel y operación digital NELVYON"
              width={1200}
              height={800}
              className="h-auto w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-6">
            <Header>Historia</Header>
            <p className="text-muted-foreground text-lg leading-7">{nelvyonAboutFull.historia}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-[#0084FF]/25 bg-[#0084FF]/5 p-8">
            <h3 className="-tracking-sm text-xl font-medium">Misión</h3>
            <p className="text-muted-foreground mt-4 text-base leading-6">{nelvyonAboutFull.mision}</p>
          </div>
          <div className="rounded-3xl border border-white/10 p-8">
            <h3 className="-tracking-sm text-xl font-medium">Visión</h3>
            <p className="text-muted-foreground mt-4 text-base leading-6">{nelvyonAboutFull.vision}</p>
          </div>
        </div>

        <div>
          <Header>Valores</Header>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nelvyonAboutFull.valores.map((v) => (
              <div key={v.title} className="bg-natural-white rounded-2xl p-6 text-natural-black">
                <h4 className="font-medium">{v.title}</h4>
                <p className="text-muted-foreground mt-2 text-sm leading-6">{v.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 p-8 md:p-12">
          <h3 className="-tracking-sm text-2xl font-medium">Filosofía</h3>
          <p className="text-muted-foreground mt-4 max-w-3xl text-lg leading-7">
            {nelvyonAboutFull.filosofia}
          </p>
        </div>

        <div>
          <Header>Cómo trabajamos</Header>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            {nelvyonAboutFull.comoTrabajamos.map((s) => (
              <div key={s.step} className="rounded-2xl bg-[#020817] border border-white/10 p-6">
                <span className="text-[#0084FF] text-sm font-medium">{s.step}</span>
                <h4 className="mt-2 font-medium">{s.title}</h4>
                <p className="text-muted-foreground mt-2 text-sm leading-6">{s.body}</p>
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
                className="flex gap-3 rounded-2xl border border-[#0084FF]/20 px-6 py-4 text-base leading-6"
              >
                <span className="text-[#0084FF] shrink-0">→</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
