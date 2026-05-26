"use client";

import { useState } from "react";

import { TABS } from "./constants";
import { DashboardMockup } from "./DashboardMockup";
import { CheckList, SectionHeading } from "./ui";
import { FadeIn } from "./FadeIn";
import { COLORS } from "./constants";

export function LandingTabsSection() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section className="py-20 md:py-28" id="plataforma" style={{ backgroundColor: COLORS.bg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading
            light
            subtitle="Todas las herramientas que necesitas en una sola plataforma con IA"
            title="Tu plataforma todo en uno para crecer"
          />
        </FadeIn>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {TABS.map((t, i) => (
            <button
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                i === active
                  ? "text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
              key={t.id}
              onClick={() => setActive(i)}
              style={
                i === active
                  ? { backgroundColor: COLORS.primary }
                  : { border: `1px solid ${COLORS.cardBorder}` }
              }
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
        <FadeIn>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-bold text-white md:text-3xl">{tab.title}</h3>
              <p className="mt-4 text-zinc-400">{tab.description}</p>
              <div className="mt-8">
                <CheckList items={tab.features} />
              </div>
            </div>
            <DashboardMockup />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
