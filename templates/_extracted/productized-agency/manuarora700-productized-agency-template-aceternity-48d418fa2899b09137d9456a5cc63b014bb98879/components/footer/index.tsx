import Link from "next/link";

import { cn } from "@/lib/utils";
import { Container } from "@/components/container";
import {
  ArrowRightLongerIcon,
  CopyRightIcon,
  Instagram,
  LinkedIn,
  XformerlyTwitter,
} from "@/components/icons/general";
import { Button } from "@/components/button";
import { Logo } from "@/components/logo";

const data = {
  Home: [
    { label: "Overview", href: "#" },
    { label: "Features", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Testimonials", href: "#" },
    { label: "FAQs", href: "#" },
  ],
  About: [
    { label: "Our Story", href: "#" },
    { label: "Team", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Press Kit", href: "#" },
  ],
  Contact: [
    { label: "Contact Us", href: "#" },
    { label: "Support", href: "#" },
    { label: "Live Chat", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Report Issue", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "Licenses", href: "#" },
    { label: "Security", href: "#" },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-natural-black relative overflow-hidden">
      <div className="absolute inset-0 -left-128.75">
        <div className="absolute top-0 left-[387.07px] h-293.75 w-[720.16px] rounded-full bg-[#27251F] blur-[287.15px]" />
        <div className="absolute top-[284.85px] left-0 h-[502.50px] w-[488.15px] rounded-full bg-white blur-[215.36px]" />
      </div>
      <Container className="flex flex-col gap-30 pt-20 pb-10">
        <div className="bg-natural-white/5 shadow-card-xl relative h-112 overflow-hidden rounded-4xl">
          <div
            className={cn(
              "-tracking-xl absolute top-51 -left-3.25 justify-start text-[132px] leading-75 font-medium opacity-25 md:text-[240px] lg:text-[300px]",
              "bg-[linear-gradient(90deg,#FFFFFF_0%,rgba(52,52,52,0)_100%)] bg-clip-text text-transparent",
            )}
          >
            Aceternity
          </div>
          <div className="absolute inset-0 flex h-fit w-full flex-col items-start justify-between px-6 pt-10 md:flex-row md:px-15 md:pt-16">
            <div className="text-natural-white -tracking-lg w-full max-w-135 justify-center text-[32px] font-medium md:text-5xl md:leading-14 lg:text-[56px] lg:leading-16">
              Make Your Website a Sales Machine
            </div>
            <div className="inline-flex w-16 flex-col items-start justify-start gap-2.5 py-6">
              <Link
                href="/"
                className="bg-natural-white shadow-card-md inline-flex items-center justify-center gap-2.5 self-stretch rounded-xl px-6 py-2"
              >
                <ArrowRightLongerIcon className="scale-150" />
              </Link>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center gap-18">
          <div className="grid w-full grid-cols-1 gap-15 lg:grid-cols-2 lg:gap-0">
            <div className="flex flex-col gap-4">
              <Logo className="size-8" />
              <span className="text-muted-foreground text-sm leading-5">
                We design and build websites that drive results
              </span>
              <div>
                <Button text="Get started" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-0">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-4">
                  <h3 className="text-muted-foreground -tracking-sm text-xs leading-5 font-medium">
                    {key}
                  </h3>
                  <ul className="flex flex-col gap-4">
                    {value.map((item, index) => (
                      <li key={index}>
                        <Link
                          href={item.href}
                          className="text-natural-white -tracking-sm text-sm leading-5 font-medium hover:underline"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-col justify-between gap-6 md:flex-row md:items-center md:gap-0">
            <div>
              <span className="flex items-center gap-1">
                <CopyRightIcon />
                <span className="text-muted-foreground text-xs leading-5 font-medium">
                  2025 Aceternity Labs - All Rights Reserved
                </span>
              </span>
            </div>
            <div className="flex items-center gap-5">
              <Link href={"https://x.com/aceternitylabs"} target="_blank">
                <XformerlyTwitter className="text-muted-foreground hover:text-natural-white size-4 transition-colors" />
              </Link>
              <Link
                href={"https://www.linkedin.com/company/aceternity"}
                target="_blank"
              >
                <LinkedIn className="text-muted-foreground hover:text-natural-white size-4 transition-colors" />
              </Link>
              <Link
                href={"https://www.instagram.com/aceternity/"}
                target="_blank"
              >
                <Instagram className="text-muted-foreground hover:text-natural-white size-4 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

