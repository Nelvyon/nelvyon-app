"use client";

import { useState } from "react";

import { TABS } from "./constants";
import { DashboardMockup } from "./DashboardMockup";
import { CheckList, PrimaryButton, SectionBadge, SectionHeading } from "./ui";
import { FadeIn } from "./FadeIn";
import { BRAND } from "./shared";

export function LandingTabsSection() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section className="relative z-10 py-20 md:py-28" id="plataforma" style={{ backgroundColor: "#050816" }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <div className="text-center">
            <SectionBadge>FUNCIONALIDADES</SectionBadge>
            <div className="mt-4">
              <SectionHeading
                center
                light
                subtitle="Todo el ciclo de marketing en una sola plataforma con IA"
                title="De la captación al crecimiento"
              />
            </div>
          </div>
        </FadeIn>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {TABS.map((t, i) => (
            <button
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                i === active ? "text-white" : "text-[#94A3B8] hover:text-white"
              }`}
              key={t.id}
              onClick={() => setActive(i)}
              style={
                i === active
                  ? { backgroundColor: t.color }
                  : { border: `1px solid ${BRAND.cardBorder}`, backgroundColor: BRAND.card }
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
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
                style={{ backgroundColor: tab.color }}
              >
                {tab.label.charAt(0)}
              </div>
              <h3 className="text-2xl font-extrabold text-white md:text-3xl">{tab.title}</h3>
              <p className="mt-4 leading-relaxed text-[#94A3B8]">{tab.description}</p>
              <div className="mt-8">
                <CheckList items={tab.features} />
              </div>
              <div className="mt-10">
                <PrimaryButton href="/contacto">Solicitar propuesta</PrimaryButton>
              </div>
            </div>
            <DashboardMockup />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
