"use client";

import { motion } from "framer-motion";

import type { LandingBlock } from "@/features/builders/types";
import { cn } from "@/core/ui/utils";

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function BlockSection({ block, children }: { block: LandingBlock; children: React.ReactNode }) {
  const hideMobile = block.responsive?.hideOnMobile;
  const padding = str(block.props.padding, "48px 24px");
  const bg = str(block.props.backgroundColor);
  return (
    <motion.section
      {...fade}
      className={cn("w-full", hideMobile && "hidden md:block")}
      style={{ padding, backgroundColor: bg || undefined }}
    >
      <motion.div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</motion.div>
    </motion.section>
  );
}

export function BlockRenderer({ blocks }: { blocks: LandingBlock[] }) {
  return (
    <motion.div className="font-[family-name:var(--font-inter,Inter,DM_Sans,sans-serif)]">
      {blocks.map((block) => {
        const p = block.props;
        switch (block.type) {
          case "hero":
            return (
              <BlockSection block={block} key={block.id}>
                <motion.div className="py-12 text-center md:py-20" {...fade}>
                  <h1
                    className="text-4xl font-bold tracking-tight md:text-6xl"
                    style={{ color: str(p.textColor, "#fff") }}
                  >
                    {str(p.headline, "Welcome")}
                  </h1>
                  <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90" style={{ color: str(p.textColor, "#fff") }}>
                    {str(p.subheadline)}
                  </p>
                  {p.ctaText ? (
                    <a
                      className="mt-8 inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-105"
                      href={str(p.ctaUrl, "#")}
                    >
                      {str(p.ctaText)}
                    </a>
                  ) : null}
                </motion.div>
              </BlockSection>
            );
          case "text":
            return (
              <BlockSection block={block} key={block.id}>
                <p className="text-lg leading-relaxed" style={{ color: str(p.textColor, "#1e293b") }}>
                  {str(p.content)}
                </p>
              </BlockSection>
            );
          case "image":
            return (
              <BlockSection block={block} key={block.id}>
                {p.imageUrl ? (
                  <div className="relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={str(p.alt, "")} className="h-full w-full object-cover" src={str(p.imageUrl)} />
                  </div>
                ) : null}
              </BlockSection>
            );
          case "video":
            return (
              <BlockSection block={block} key={block.id}>
                {p.videoUrl ? (
                  <video className="mx-auto max-w-4xl rounded-2xl" controls poster={str(p.posterUrl)} src={str(p.videoUrl)} />
                ) : null}
              </BlockSection>
            );
          case "cta":
            return (
              <BlockSection block={block} key={block.id}>
                <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: str(p.backgroundColor, "#6366f1") }}>
                  <h2 className="text-2xl font-bold" style={{ color: str(p.textColor, "#fff") }}>
                    {str(p.headline)}
                  </h2>
                  <a
                    className="mt-6 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900"
                    href={str(p.buttonUrl, "#")}
                  >
                    {str(p.buttonText, "Continue")}
                  </a>
                </div>
              </BlockSection>
            );
          case "form":
            return (
              <BlockSection block={block} key={block.id}>
                <h3 className="mb-4 text-xl font-semibold">{str(p.headline, "Contact us")}</h3>
                <form className="grid max-w-md gap-3" onSubmit={(e) => e.preventDefault()}>
                  <input className="rounded-lg border px-4 py-2" placeholder="Name" type="text" />
                  <input className="rounded-lg border px-4 py-2" placeholder="Email" type="email" />
                  <textarea className="rounded-lg border px-4 py-2" placeholder="Message" rows={4} />
                  <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" type="submit">
                    {str(p.submitText, "Submit")}
                  </button>
                </form>
              </BlockSection>
            );
          case "testimonials": {
            const items = (p.items as { quote?: string; author?: string; role?: string }[]) ?? [];
            return (
              <BlockSection block={block} key={block.id}>
                <motion.div className="grid gap-6 md:grid-cols-3">
                  {items.map((t, i) => (
                    <motion.blockquote
                      className="rounded-xl border bg-card p-6 shadow-sm"
                      key={i}
                      {...fade}
                    >
                      <p className="text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                      <footer className="mt-4 text-sm font-medium">
                        {t.author}
                        {t.role ? <span className="text-muted-foreground"> — {t.role}</span> : null}
                      </footer>
                    </motion.blockquote>
                  ))}
                </motion.div>
              </BlockSection>
            );
          }
          case "pricing": {
            const plans = (p.plans as { name?: string; price?: string; features?: string[] }[]) ?? [];
            return (
              <BlockSection block={block} key={block.id}>
                <div className="grid gap-6 md:grid-cols-3">
                  {plans.map((plan, i) => (
                    <div className="rounded-2xl border bg-card p-6 shadow-card" key={i}>
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="mt-2 text-3xl font-bold">{plan.price}</p>
                      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        {(plan.features ?? []).map((f) => (
                          <li key={f}>✓ {f}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </BlockSection>
            );
          }
          case "faq": {
            const items = (p.items as { question?: string; answer?: string }[]) ?? [];
            return (
              <BlockSection block={block} key={block.id}>
                <motion.div className="space-y-4">
                  {items.map((item, i) => (
                    <details className="rounded-lg border bg-card p-4" key={i}>
                      <summary className="cursor-pointer font-medium">{item.question}</summary>
                      <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                    </details>
                  ))}
                </motion.div>
              </BlockSection>
            );
          }
          case "countdown":
            return (
              <BlockSection block={block} key={block.id}>
                <div className="text-center">
                  <h3 className="text-2xl font-bold">{str(p.headline)}</h3>
                  {p.targetDate ? (
                    <p className="mt-2 text-muted-foreground">{str(p.targetDate)}</p>
                  ) : null}
                </div>
              </BlockSection>
            );
          case "social_proof": {
            const stats = (p.stats as { label?: string; value?: string }[]) ?? [];
            return (
              <BlockSection block={block} key={block.id}>
                <div className="flex flex-wrap justify-center gap-8">
                  {stats.map((s, i) => (
                    <div className="text-center" key={i}>
                      <p className="text-3xl font-bold">{s.value}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </BlockSection>
            );
          }
          default:
            return null;
        }
      })}
    </motion.div>
  );
}
