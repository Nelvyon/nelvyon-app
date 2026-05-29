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

const ECOSYSTEM: { label: string; Icon: TablerIcon }[] = [
  { label: "CRM", Icon: IconUsers },
  { label: "Meta Ads", Icon: IconBrandMeta },
  { label: "Google Ads", Icon: IconBrandGoogle },
  { label: "TikTok Ads", Icon: IconBrandTiktok },
  { label: "WhatsApp", Icon: IconBrandWhatsapp },
  { label: "Email", Icon: IconMail },
  { label: "SEO", Icon: IconSearch },
  { label: "Ecommerce", Icon: IconShoppingCart },
  { label: "Reporting", Icon: IconChartBar },
  { label: "Automatización", Icon: IconWebhook },
  { label: "Pipeline", Icon: IconLayoutKanban },
  { label: "Social Media", Icon: IconShare2 },
  { label: "Contenido", Icon: IconFileText },
  { label: "Analytics", Icon: IconChartLine },
  { label: "Integraciones", Icon: IconPlugConnected },
];

export function EcosistemaNelvyon() {
  const track = [...ECOSYSTEM, ...ECOSYSTEM];

  return (
    <section className="nelvyon-ecosystem-section nelvyon-mkt-section--airy" style={{ backgroundColor: "#f8faff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 48px" }}>
        <div style={{ maxWidth: 560 }}>
          <p className="mkt-eyebrow">Ecosistema</p>
          <h2 className="mkt-h2 fade-in">Todo conectado dentro de NELVYON</h2>
          <p className="mkt-lead" style={{ marginTop: 16 }}>
            Marketing, ventas, automatización y operaciones trabajando dentro de un mismo ecosistema.
          </p>
        </div>
      </div>
      <div className="nelvyon-ecosystem-viewport" aria-hidden>
        <div className="nelvyon-ecosystem-track">
          {track.map((item, i) => (
            <div key={`${item.label}-${i}`} className="nelvyon-ecosystem-card">
              <div className="nelvyon-ecosystem-card__icon">
                <item.Icon size={26} stroke={1.5} color="#0084fc" aria-hidden />
              </div>
              <span className="nelvyon-ecosystem-card__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
