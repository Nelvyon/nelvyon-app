import { Container } from "@/components/pa/container";
import Link from "next/link";
import {
  Instagram,
  LinkedIn,
  XformerlyTwitter,
} from "@/components/pa/icons/general";
import { cn } from "@/lib/pa/utils";
import { nelvyonAbout } from "@/config/nelvyon-pa-content";
import { PaDashboardMock } from "@/components/pa/marketing/pa-dashboard-mock";

export const AboutSection = () => {
  return (
    <section className="bg-natural-black text-natural-white relative w-full overflow-hidden">
      <div className="absolute inset-0">
        <div className="relative h-full w-full">
          <div className="absolute top-71 -left-140 h-125.5 w-122 rounded-full bg-[#0084FF]/20 blur-[214px]" />
          <div className="absolute top-0 -left-40 h-293 w-180 rounded-full bg-[#27251F] blur-[287px]" />
          <div className="absolute top-0 -right-100 h-293.75 w-180 rounded-full bg-[#27251F] blur-[287px]" />
          <div
            className={cn(
              "absolute top-10 right-52 h-141 w-197",
              "bg-[linear-gradient(to_right,#181816_1px,transparent_1px),linear-gradient(to_bottom,#181816_1px,transparent_1px)] bg-size-[44px_44px]",
              "mask-[radial-gradient(circle,black_10%,transparent_100%)]",
            )}
          ></div>
        </div>
      </div>

      <Container className="relative z-20 flex w-full flex-col gap-20 pt-20 pb-30">
        <div className="-tracking-xl text-6xl leading-18 font-medium">
          {nelvyonAbout.title}
        </div>
        <div className="grid w-full grid-cols-1 justify-between gap-30 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <PaDashboardMock featured title="Ecosistema NELVYON" badge="Sistema conectado" />
          </div>
          <div className="flex h-full w-full flex-col justify-between gap-15 lg:col-span-3">
            <div className="flex flex-col gap-6">
              <div className="flex justify-end">
                <div className="flex items-center gap-5">
                  <Link href={"https://x.com/nelvyon"} target="_blank">
                    <XformerlyTwitter className="text-muted-foreground hover:text-natural-white size-4 transition-colors" />
                  </Link>
                  <Link href={"https://www.linkedin.com/company/nelvyon"} target="_blank">
                    <LinkedIn className="text-muted-foreground hover:text-natural-white size-4 transition-colors" />
                  </Link>
                  <Link href={"https://www.instagram.com/nelvyon/"} target="_blank">
                    <Instagram className="text-muted-foreground hover:text-natural-white size-4 transition-colors" />
                  </Link>
                </div>
              </div>
              <span className="-tracking-xs text-lg leading-6.5 font-medium text-white/80">
                {nelvyonAbout.intro}
              </span>
              {nelvyonAbout.paragraphs.map((paragraph) => (
                <span
                  key={paragraph}
                  className="-tracking-xs text-lg leading-6.5 font-medium text-white/75"
                >
                  {paragraph}
                </span>
              ))}
            </div>
            <div className={cn("rounded-2xl border border-white/10 bg-[#07111F] p-6 text-sm text-white/70")}>
              Estrategia, ejecución y plataforma con el mismo criterio operativo.
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
