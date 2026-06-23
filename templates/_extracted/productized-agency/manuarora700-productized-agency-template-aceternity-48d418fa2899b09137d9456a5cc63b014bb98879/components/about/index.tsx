import Image from "next/image";
import { Container } from "@/components/container";
import { CardPin } from "@/components/icons/card-pin";
import { Testimonial } from "@/components/pricing/testimonial";
import { Adobe, GoogleLogo, Microsoft } from "@/components/icons/logo";
import {
  Marquee,
  MarqueeContent,
  MarqueeItem,
} from "@/components/kibo-ui/marquee";
import Link from "next/link";
import {
  Instagram,
  LinkedIn,
  XformerlyTwitter,
} from "@/components/icons/general";
import { cn } from "@/lib/utils";

const data = [
  {
    name: "Jason Ray",
    role: "CEO",
    message: "Aceternity and Manu are Cracked Devs!",
    avatar: "/avatar/avatar-1.webp",
    brand: <GoogleLogo />,
  },
  {
    name: "Steve Wozniak",
    role: "CTO",
    message: "Aceternity and Manu are Cracked Devs!",
    avatar: "/avatar/avatar-2.webp",
    brand: <Adobe />,
  },
  {
    name: "Elon Musk",
    role: "Founder",
    message: "Aceternity and Manu are Cracked Devs!",
    avatar: "/avatar/avatar-3.webp",
    brand: <Microsoft />,
  },
];

export const AboutSection = () => {
  return (
    <section className="bg-natural-black text-natural-white relative w-full overflow-hidden">
      <div className="absolute inset-0">
        <div className="relative h-full w-full">
          <div className="absolute top-71 -left-140 h-125.5 w-122 rounded-full bg-white blur-[214px]" />
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
          The Founder’s Desk
        </div>
        <div className="grid w-full grid-cols-1 justify-between gap-30 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Image
              src={"/assets/workers.webp"}
              alt="Founder’s Desk"
              width={1200}
              height={1200}
              className="w-full rounded-lg"
            />
          </div>
          <div className="flex h-full w-full flex-col justify-between gap-15 lg:col-span-3">
            <div className="flex flex-col gap-6">
              <div className="flex justify-end">
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
              <span className="-tracking-xs text-lg leading-6.5 font-medium">
                Hi, <span className="underline">I&apos;m Manu.</span> I&apos;ve
                been building web applications for over 8 years. I&apos;ve
                worked with startups, small businesses, and large enterprises to
                build and scale their web applications. People call me
                a &quot;Full Stack&quot; engineer but I prefer to call myself a
                problem solver :)
              </span>
              <span className="-tracking-xs text-lg leading-6.5 font-medium">
                I started Aceternity to help businesses build their web
                presence, providing unique web apps that stand out and scale
                well.
                <br />
                Also, I post relevant web development snippets and tips{" "}
                <Link
                  href={"https://x.com/mannupaaji"}
                  target="_blank"
                  className="underline"
                >
                  on my twitter
                </Link>{" "}
                and occassionally shitpost
              </span>
            </div>
            <div>
              <Marquee
                className={cn(
                  "flex h-full max-h-22 items-center",
                  "mask-[linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]",
                )}
              >
                <MarqueeContent className="h-full">
                  {data.map((item, index) => (
                    <MarqueeItem key={index}>
                      <Testimonial
                        theme={"dark"}
                        avatar={item.avatar}
                        name={item.name}
                        role={item.role}
                        brand={item.brand}
                        message={item.message}
                      />
                    </MarqueeItem>
                  ))}
                </MarqueeContent>
              </Marquee>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
