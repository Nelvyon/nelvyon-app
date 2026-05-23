"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";

import type { LandingBlock } from "@/features/builders/types";
import { cn } from "@/core/ui/utils";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-48px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

function str(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : fb;
}

function BlockSection({ block, children, className }: { block: LandingBlock; children: React.ReactNode; className?: string }) {
  const hideMobile = block.responsive?.hideOnMobile;
  const padding = str(block.props.padding, "48px 24px");
  const bg = str(block.props.backgroundColor);
  return (
    <motion.section {...fade} className={cn("w-full", hideMobile && "hidden md:block", className)} style={{ padding, backgroundColor: bg || undefined }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </motion.section>
  );
}

export function BlockRenderer({ blocks }: { blocks: LandingBlock[] }) {
  return (
    <motion.div className="font-[family-name:var(--font-inter,Inter,var(--font-dm-sans,DM_Sans),system-ui,sans-serif)]">
      {blocks.map((block) => {
        const p = block.props;
        switch (block.type) {
          case "hero":
            return (
              <BlockSection block={block} key={block.id}>
                <div className="relative overflow-hidden py-16 text-center md:py-28">
                  <motion.h1
                    className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl lg:text-7xl"
                    style={{ color: str(p.textColor, "#fff") }}
                    {...fade}
                  >
                    {str(p.headline, "Welcome")}
                  </motion.h1>
                  <motion.p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed opacity-90 md:text-xl" style={{ color: str(p.textColor, "#fff") }} {...fade}>
                    {str(p.subheadline)}
                  </motion.p>
                  {p.ctaText ? (
                    <motion.a
                      className="mt-10 inline-flex min-h-[48px] items-center rounded-full bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-elevated transition hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]"
                      href={str(p.ctaUrl, "#")}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {str(p.ctaText)}
                    </motion.a>
                  ) : null}
                </div>
              </BlockSection>
            );
          case "testimonials": {
            const items = (p.items as { quote?: string; author?: string; role?: string; avatar?: string }[]) ?? [];
            return (
              <BlockSection block={block} key={block.id}>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((t, i) => (
                    <motion.blockquote
                      className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/80 p-8 shadow-card backdrop-blur-sm transition hover:border-primary/30 hover:shadow-elevated"
                      key={i}
                      {...fade}
                    >
                      <motion.div className="mb-4 flex gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star className="h-4 w-4 fill-current" key={s} />
                        ))}
                      </motion.div>
                      <p className="flex-1 text-base leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                      <footer className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                        {t.avatar ? (
                          <Image alt="" className="rounded-full object-cover" height={40} src={t.avatar} width={40} />
                        ) : (
                          <motion.div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {(t.author ?? "?").charAt(0)}
                          </motion.div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.author}</p>
                          {t.role ? <p className="text-xs text-muted-foreground">{t.role}</p> : null}
                        </div>
                      </footer>
                    </motion.blockquote>
                  ))}
                </div>
              </BlockSection>
            );
          }
          case "pricing": {
            const plans = (p.plans as { name?: string; price?: string; features?: string[]; highlighted?: boolean }[]) ?? [];
            return (
              <BlockSection block={block} key={block.id}>
                <div className="grid gap-8 md:grid-cols-3">
                  {plans.map((plan, i) => (
                    <motion.div
                      className={cn(
                        "relative flex flex-col rounded-2xl border bg-card p-8 shadow-card transition hover:-translate-y-1 hover:shadow-elevated",
                        plan.highlighted ? "border-primary ring-2 ring-primary/20" : "border-border",
                      )}
                      key={i}
                      {...fade}
                    >
                      {plan.highlighted ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                          Popular
                        </span>
                      ) : null}
                      <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                      <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight">{plan.price}</p>
                      <ul className="mt-8 flex-1 space-y-3 text-sm text-muted-foreground">
                        {(plan.features ?? []).map((f) => (
                          <li className="flex gap-2" key={f}>
                            <span className="text-primary">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button className="mt-8 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90" type="button">
                        Elegir plan
                      </button>
                    </motion.div>
                  ))}
                </div>
              </BlockSection>
            );
          }
          case "faq": {
            const items = (p.items as { question?: string; answer?: string }[]) ?? [];
            return (
              <BlockSection block={block} key={block.id}>
                <FaqAccordion items={items} />
              </BlockSection>
            );
          }
          case "social_proof": {
            const stats = (p.stats as { label?: string; value?: string }[]) ?? [];
            return (
              <BlockSection block={block} key={block.id}>
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                  {stats.map((s, i) => (
                    <motion.div className="text-center" key={i} {...fade}>
                      <p className="text-4xl font-bold tabular-nums tracking-tight md:text-5xl">{s.value}</p>
                      <p className="mt-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    </motion.div>
                  ))}
                </div>
              </BlockSection>
            );
          }
          case "cta":
            return (
              <BlockSection block={block} key={block.id}>
                <motion.div
                  className="overflow-hidden rounded-3xl p-10 text-center md:p-16"
                  style={{ backgroundColor: str(p.backgroundColor, "hsl(var(--primary))") }}
                  {...fade}
                >
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl" style={{ color: str(p.textColor, "#fff") }}>
                    {str(p.headline, "Ready to start?")}
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-base opacity-90" style={{ color: str(p.textColor, "#fff") }}>
                    {str(p.subheadline)}
                  </p>
                  <a
                    className="mt-8 inline-flex min-h-[48px] items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.02]"
                    href={str(p.buttonUrl, "#")}
                  >
                    {str(p.buttonText, "Continue")}
                  </a>
                </motion.div>
              </BlockSection>
            );
          case "form":
            return (
              <BlockSection block={block} key={block.id}>
                <FormBlock headline={str(p.headline, "Contact us")} submitText={str(p.submitText, "Submit")} />
              </BlockSection>
            );
          case "text":
            return (
              <BlockSection block={block} key={block.id}>
                <p className="text-lg leading-relaxed md:text-xl" style={{ color: str(p.textColor, "inherit") }}>
                  {str(p.content)}
                </p>
              </BlockSection>
            );
          case "image":
            return (
              <BlockSection block={block} key={block.id}>
                {p.imageUrl ? (
                  <div className="relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-2xl shadow-elevated">
                    <Image alt={str(p.alt, "")} className="object-cover" fill sizes="(max-width:768px) 100vw, 896px" src={str(p.imageUrl)} />
                  </div>
                ) : null}
              </BlockSection>
            );
          default:
            return null;
        }
      })}
    </motion.div>
  );
}

function FaqAccordion({ items }: { items: { question?: string; answer?: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, i) => (
        <motion.div className="overflow-hidden rounded-xl border border-border bg-card shadow-card" key={i} {...fade}>
          <button
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-muted/50"
            onClick={() => setOpen(open === i ? null : i)}
            type="button"
          >
            <span className="font-medium text-foreground">{item.question}</span>
            <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition", open === i && "rotate-180")} />
          </button>
          {open === i ? (
            <motion.div animate={{ height: "auto", opacity: 1 }} className="border-t border-border px-6 pb-4 pt-2 text-sm leading-relaxed text-muted-foreground" initial={{ height: 0, opacity: 0 }}>
              {item.answer}
            </motion.div>
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}

function FormBlock({ headline, submitText }: { headline: string; submitText: string }) {
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <motion.div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card" {...fade}>
        <p className="text-lg font-semibold text-foreground">¡Gracias!</p>
        <p className="mt-2 text-sm text-muted-foreground">Te contactaremos pronto.</p>
      </motion.div>
    );
  }
  return (
    <div className="mx-auto max-w-md">
      <h3 className="mb-6 text-2xl font-bold tracking-tight">{headline}</h3>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
        <input className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Name" required type="text" />
        <input className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Email" required type="email" />
        <textarea className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Message" required rows={4} />
        <button className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90" type="submit">
          {submitText}
        </button>
      </form>
    </div>
  );
}
