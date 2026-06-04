import Link from "next/link";

import { cn } from "@/lib/pa/utils";
import { Container } from "@/components/pa/container";
import {
  ArrowRightLongerIcon,
  CopyRightIcon,
  Instagram,
  LinkedIn,
  XformerlyTwitter,
} from "@/components/pa/icons/general";
import { Button } from "@/components/pa/button";
import { Logo } from "@/components/pa/logo";
import { nelvyonFooter } from "@/config/nelvyon-pa-content";

export const Footer = () => {
  return (
    <footer className="relative overflow-hidden bg-[#020817]">
      <div className="absolute inset-0 -left-128.75">
        <div className="absolute top-0 left-[387.07px] h-293.75 w-[720.16px] rounded-full bg-[#0047AB]/25 blur-[287.15px]" />
        <div className="absolute top-[284.85px] left-0 h-[502.50px] w-[488.15px] rounded-full bg-[#0084FF]/10 blur-[215.36px]" />
      </div>
      <Container className="flex flex-col gap-30 pt-20 pb-10">
        <div className="relative h-112 overflow-hidden rounded-4xl border border-white/10 bg-[#07111F]/80 shadow-card-xl">
          <div
            className={cn(
              "-tracking-xl absolute top-51 -left-3.25 justify-start text-[132px] leading-75 font-medium opacity-20 md:text-[240px] lg:text-[300px]",
              "bg-[linear-gradient(90deg,#FFFFFF_0%,rgba(52,52,52,0)_100%)] bg-clip-text text-transparent",
            )}
          >
            NELVYON
          </div>
          <div className="absolute inset-0 flex h-fit w-full flex-col items-start justify-between gap-6 px-6 pt-10 md:flex-row md:items-center md:px-15 md:pt-16">
            <div className="text-natural-white -tracking-lg w-full max-w-135 justify-center text-[28px] font-medium leading-tight md:text-5xl md:leading-14 lg:text-[56px] lg:leading-16">
              {nelvyonFooter.ctaTitle}
            </div>
            <Link
              href={nelvyonFooter.ctaHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-6 py-3 text-sm font-medium text-white shadow-[0_0_32px_rgba(0,132,255,0.35)] transition hover:bg-[#0071db]"
            >
              <span className="md:hidden">Contacto</span>
              <span className="hidden md:inline">Ir a contacto</span>
              <ArrowRightLongerIcon className="size-4" />
            </Link>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center gap-18">
          <div className="grid w-full grid-cols-1 gap-15 lg:grid-cols-2 lg:gap-0">
            <div className="flex flex-col gap-4">
              <Logo className="size-8" />
              <p className="text-natural-white -tracking-sm max-w-md text-sm leading-6 font-medium">
                {nelvyonFooter.tagline}
              </p>
              <div>
                <Button variant="primary" text="Explorar servicios" href="/servicios" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-10 md:gap-16">
              <div className="flex flex-col gap-4">
                <h3 className="text-xs leading-5 font-medium text-white/65">Navegación</h3>
                <ul className="flex flex-col gap-4">
                  {nelvyonFooter.mainLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-natural-white -tracking-sm text-sm leading-5 font-medium text-white/90 transition hover:text-white hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="text-xs leading-5 font-medium text-white/65">Legal</h3>
                <ul className="flex flex-col gap-4">
                  {nelvyonFooter.legalLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-natural-white -tracking-sm text-sm leading-5 font-medium text-white/90 transition hover:text-white hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col justify-between gap-6 md:flex-row md:items-center md:gap-0">
            <div>
              <span className="flex items-center gap-1">
                <CopyRightIcon />
                <span className="text-xs leading-5 font-medium text-white/65">
                  {nelvyonFooter.copyright}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-5">
              <Link href={"https://x.com/nelvyon"} target="_blank">
                <XformerlyTwitter className="size-4 text-white/65 transition-colors hover:text-white" />
              </Link>
              <Link href={"https://www.linkedin.com/company/nelvyon"} target="_blank">
                <LinkedIn className="size-4 text-white/65 transition-colors hover:text-white" />
              </Link>
              <Link href={"https://www.instagram.com/nelvyon/"} target="_blank">
                <Instagram className="size-4 text-white/65 transition-colors hover:text-white" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};
