import Image from "next/image";
import { Container } from "@/components/container";
import {
  PaperClipIcon,
  PlusIcon,
  ThunderIcon,
  UpArrowIcon,
} from "@/components/icons/general";
import { ChevronDown } from "lucide-react";

const logos = [
  "/logos/claude.webp",
  "/logos/meta.webp",
  "/logos/openai.webp",
  "/logos/perplexity.webp",
  "/logos/replicate.webp",
];

export const Acebuilder = () => {
  return (
    <section className="w-full">
      <Container className="flex flex-col items-center gap-15 pt-30 pb-20">
        <div className="flex w-full flex-col gap-12">
          {/* header */}
          <div className="flex flex-col items-center gap-6">
            <div className="bg-natural-white flex gap-0.5 rounded-full p-0.5">
              <div className="text-natural-white bg-natural-black -tracking-sm rounded-full px-2 py-1.5 text-xs leading-3 font-medium">
                New Launch
              </div>
              <span className="px-2 py-1.5 text-xs leading-3 font-medium">
                Production ready apps in minutes
              </span>
            </div>
            <h2 className="-tracking-xl text-center text-6xl leading-17 font-medium">
              Acebuilder is now Live
            </h2>
          </div>
          {/* input */}
          <div className="bg-natural-black relative mx-auto flex w-full max-w-225 flex-col gap-2.5 overflow-hidden rounded-3xl p-3">
            <div className="absolute inset-0">
              <div className="relative h-full w-full">
                <div className="absolute top-90 left-0 h-7 w-248.5 origin-top-left -translate-y-1/2 rotate-[-23deg] rounded-full bg-indigo-200/60 blur-[20px]" />
                <div className="absolute top-90 -left-20 h-7 w-248.5 origin-top-left -translate-y-1/2 rotate-[-23deg] rounded-full bg-indigo-200/60 blur-2xl" />
              </div>
            </div>
            <div className="flex items-center gap-2 px-3">
              <ThunderIcon />
              <span className="text-sm leading-7 text-[#999999]">
                Unlock more features with Pro
              </span>
            </div>
            <div className="bg-natural-white text-natural-black z-10 flex min-h-50 flex-col justify-between rounded-2xl p-6">
              <span className="-tracking-xs text-base leading-7 text-[#999999]">
                Generate a landing page for a healthcare b2b SaaS
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <PlusIcon />
                  <div className="flex gap-1 rounded-lg bg-[#F0F0F0] py-1.5 pr-2 pl-3">
                    <span className="text-muted-foreground text-sm leading-5.5 font-medium">
                      Claude 3.7 Sonnet
                    </span>
                    <ChevronDown className="text-muted-foreground size-3.5" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PaperClipIcon />
                  <div className="bg-natural-black flex size-10 items-center justify-center rounded-full">
                    <UpArrowIcon />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col items-center gap-6">
          <span className="text-muted-foreground -tracking-xs text-sm leading-4 font-medium uppercase">
            Powered by the best
          </span>
          <div className="mx-auto flex w-full gap-10 md:gap-0 justify-center max-w-200 flex-wrap md:items-center md:justify-between md:flex-nowrap">
            {logos.map((logo, index) => (
              <Image
                key={`${logo}-${index}`}
                src={logo}
                alt={`logo-${index}`}
                height={100}
                width={100}
                className="w-22"
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

