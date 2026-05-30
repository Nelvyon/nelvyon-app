"use client";

import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBrandGoogle,
  IconBrandMeta,
  IconBrandTiktok,
  IconBrandWhatsapp,
  IconChartBar,
  IconChartLine,
  IconFileText,
  IconLayoutKanban,
  IconMail,
  IconPlugConnected,
  IconSearch,
  IconShare2,
  IconShoppingCart,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type EcosystemItem = {
  label: string;
  Icon: TablerIcon;
  tint: string;
  iconColor: string;
};

const ECOSYSTEM: EcosystemItem[] = [
  { label: "CRM", Icon: IconUsers, tint: "rgba(0,132,252,0.1)", iconColor: NELVYON_BLUE },
  { label: "Meta Ads", Icon: IconBrandMeta, tint: "rgba(24,119,242,0.12)", iconColor: "#1877f2" },
  { label: "Google Ads", Icon: IconBrandGoogle, tint: "rgba(234,67,53,0.1)", iconColor: "#ea4335" },
  { label: "WhatsApp", Icon: IconBrandWhatsapp, tint: "rgba(37,211,102,0.12)", iconColor: "#25d366" },
  { label: "Email", Icon: IconMail, tint: "rgba(0,132,252,0.1)", iconColor: NELVYON_BLUE },
  { label: "Reporting", Icon: IconChartBar, tint: "rgba(0,132,252,0.1)", iconColor: NELVYON_BLUE },
];

const ECOSYSTEM_MORE: EcosystemItem[] = [
  { label: "TikTok Ads", Icon: IconBrandTiktok, tint: "rgba(0,0,0,0.06)", iconColor: "#111827" },
  { label: "SEO", Icon: IconSearch, tint: "rgba(99,102,241,0.1)", iconColor: "#6366f1" },
  { label: "Ecommerce", Icon: IconShoppingCart, tint: "rgba(245,158,11,0.12)", iconColor: "#f59e0b" },
  { label: "Automatización", Icon: IconWebhook, tint: "rgba(139,92,246,0.1)", iconColor: "#8b5cf6" },
  { label: "Pipeline", Icon: IconLayoutKanban, tint: "rgba(14,165,233,0.1)", iconColor: "#0ea5e9" },
  { label: "Social Media", Icon: IconShare2, tint: "rgba(236,72,153,0.1)", iconColor: "#ec4899" },
  { label: "Contenido", Icon: IconFileText, tint: "rgba(100,116,139,0.1)", iconColor: "#64748b" },
  { label: "Analytics", Icon: IconChartLine, tint: "rgba(0,132,252,0.1)", iconColor: NELVYON_BLUE },
  { label: "Integraciones", Icon: IconPlugConnected, tint: "rgba(0,132,252,0.1)", iconColor: NELVYON_BLUE },
];

export function EcosistemaNelvyon() {
  const track = [...ECOSYSTEM_MORE, ...ECOSYSTEM_MORE];

  return (
    <section className="nelvyon-ecosystem-section nelvyon-mkt-section--airy">
      <div className="nelvyon-ecosystem-section__header">
        <p className="mkt-eyebrow">Ecosistema</p>
        <h2 className="mkt-h2 mkt-h2--display fade-in">Todo conectado dentro de NELVYON</h2>
        <p className="mkt-lead nelvyon-ecosystem-section__lead">
          Marketing, ventas, automatización y operaciones trabajando dentro de un mismo ecosistema.
        </p>
      </div>

      <div className="nelvyon-section-inner nelvyon-ecosystem-grid-wrap">
        <div className="nelvyon-ecosystem-grid">
          {ECOSYSTEM.map((item) => (
            <div key={item.label} className="nelvyon-ecosystem-feature-card mkt-card">
              <div className="nelvyon-ecosystem-feature-card__icon" style={{ background: item.tint }}>
                <item.Icon size={28} stroke={1.5} color={item.iconColor} aria-hidden />
              </div>
              <h3 className="mkt-card__title nelvyon-ecosystem-feature-card__title">{item.label}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className="nelvyon-ecosystem-stage nelvyon-ecosystem-stage--carousel">
        <div className="nelvyon-ecosystem-viewport">
          <div className="nelvyon-ecosystem-track">
            {track.map((item, i) => (
              <div key={`${item.label}-${i}`} className="nelvyon-ecosystem-card">
                <div className="nelvyon-ecosystem-card__icon" style={{ background: item.tint }}>
                  <item.Icon size={28} stroke={1.5} color={item.iconColor} aria-hidden />
                </div>
                <span className="nelvyon-ecosystem-card__label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
