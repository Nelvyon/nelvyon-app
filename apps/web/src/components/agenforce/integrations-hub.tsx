"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBrandWordpress,
  IconCalendar,
  IconChartBar,
  IconMail,
  IconUsers,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type IntegrationStatus = "available" | "coming";

type IntegrationNode = {
  name: string;
  status: IntegrationStatus;
  angle: number;
  slug?: string;
  brandColor?: string;
  Icon?: TablerIcon;
  iconColor?: string;
  bg?: string;
};

const AVAILABLE: IntegrationNode[] = [
  { name: "Meta", status: "available", slug: "meta", brandColor: "1877f2", angle: 0 },
  { name: "Google", status: "available", slug: "google", brandColor: "ea4335", angle: 30 },
  { name: "TikTok", status: "available", slug: "tiktok", brandColor: "000000", angle: 60 },
  { name: "Instagram", status: "available", slug: "instagram", brandColor: "e4405f", angle: 90 },
  { name: "LinkedIn", status: "available", slug: "linkedin", brandColor: "0a66c2", angle: 120 },
  { name: "WhatsApp", status: "available", slug: "whatsapp", brandColor: "25d366", angle: 150 },
  { name: "Email", status: "available", Icon: IconMail, iconColor: NELVYON_BLUE, bg: "rgba(0,132,252,0.12)", angle: 180 },
  { name: "CRM", status: "available", Icon: IconUsers, iconColor: NELVYON_BLUE, bg: "rgba(0,132,252,0.12)", angle: 210 },
  { name: "Stripe", status: "available", slug: "stripe", brandColor: "635bff", angle: 240 },
  { name: "Shopify", status: "available", slug: "shopify", brandColor: "96bf48", angle: 270 },
  { name: "Calendario", status: "available", Icon: IconCalendar, iconColor: NELVYON_BLUE, bg: "rgba(0,132,252,0.12)", angle: 300 },
  { name: "Reporting", status: "available", Icon: IconChartBar, iconColor: NELVYON_BLUE, bg: "rgba(0,132,252,0.12)", angle: 330 },
];

const COMING: IntegrationNode[] = [
  { name: "WooCommerce", status: "coming", Icon: IconBrandWordpress, iconColor: "#96588a", bg: "rgba(150,88,138,0.12)", angle: 255 },
];

const INTEGRATIONS = [...AVAILABLE, ...COMING];

const HUB_RADIUS = 42;
const NODE_RADIUS = 38;

function polarToPercent(angleDeg: number, radiusPercent: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: 50 + radiusPercent * Math.cos(rad),
    y: 50 + radiusPercent * Math.sin(rad),
  };
}

function IntegrationIcon({ item }: { item: IntegrationNode }) {
  if (item.slug && item.brandColor) {
    return (
      <img
        src={`https://cdn.simpleicons.org/${item.slug}/${item.brandColor}`}
        alt=""
        width={22}
        height={22}
        className="nelvyon-integrations-hub__brand-logo"
      />
    );
  }
  if (item.Icon) {
    return <item.Icon size={20} stroke={1.5} color={item.iconColor ?? NELVYON_BLUE} aria-hidden />;
  }
  return null;
}

export function IntegrationsHub() {
  return (
    <section className="nelvyon-integrations-hub" aria-labelledby="integrations-hub-title">
      <div className="nelvyon-integrations-hub__glow nelvyon-integrations-hub__glow--pulse" aria-hidden />
      <div className="nelvyon-integrations-hub__inner">
        <header className="nelvyon-integrations-hub__head">
          <p className="mkt-eyebrow nelvyon-integrations-hub__eyebrow">Integraciones</p>
          <h2 id="integrations-hub-title" className="mkt-h2 mkt-h2--display mkt-h2--light fade-in">
            Conecta tus herramientas. Centraliza tu operación.
          </h2>
          <p className="mkt-lead--light nelvyon-integrations-hub__lead fade-in">
            Canales, pagos, CRM y reporting conectados hacia un entorno operativo único.
          </p>
          <div className="nelvyon-integrations-hub__legend fade-in">
            <span className="nelvyon-integrations-hub__legend-item nelvyon-integrations-hub__legend-item--available">
              <span className="nelvyon-integrations-hub__legend-dot nelvyon-integrations-hub__legend-dot--available" />
              Disponible · {AVAILABLE.length}
            </span>
            <span className="nelvyon-integrations-hub__legend-item nelvyon-integrations-hub__legend-item--coming">
              <span className="nelvyon-integrations-hub__legend-dot nelvyon-integrations-hub__legend-dot--coming" />
              Próximamente · {COMING.length}
            </span>
          </div>
        </header>

        <div className="nelvyon-integrations-hub__stage" role="img" aria-label="Integraciones conectadas a NELVYON">
          <svg className="nelvyon-integrations-hub__svg nelvyon-integrations-hub__svg--spin" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <circle cx="50" cy="50" r={HUB_RADIUS + 2} fill="none" stroke="rgba(0,132,252,0.12)" strokeWidth="0.35" strokeDasharray="1.2 1.8" />
            <circle cx="50" cy="50" r={HUB_RADIUS - 6} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.25" />
            {INTEGRATIONS.map((item) => {
              const node = polarToPercent(item.angle, NODE_RADIUS);
              return (
                <line
                  key={`line-${item.name}`}
                  x1="50"
                  y1="50"
                  x2={node.x}
                  y2={node.y}
                  className={`nelvyon-integrations-hub__line nelvyon-integrations-hub__line--${item.status}`}
                />
              );
            })}
          </svg>

          <motion.div
            className="nelvyon-integrations-hub__core"
            animate={{ boxShadow: ["0 0 40px rgba(0,132,252,0.2)", "0 0 70px rgba(0,132,252,0.35)", "0 0 40px rgba(0,132,252,0.2)"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="nelvyon-integrations-hub__core-ring" aria-hidden />
            <Image src="/logo.png" alt="" width={40} height={40} className="nelvyon-integrations-hub__logo" />
            <span className="nelvyon-integrations-hub__brand">NELVYON</span>
          </motion.div>

          {INTEGRATIONS.map((item, i) => {
            const pos = polarToPercent(item.angle, NODE_RADIUS);
            return (
              <motion.div
                key={item.name}
                className={`nelvyon-integrations-hub__node nelvyon-integrations-hub__node--${item.status}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
              >
                <div className="nelvyon-integrations-hub__node-icon" style={{ background: item.bg ?? "rgba(255,255,255,0.06)" }}>
                  <IntegrationIcon item={item} />
                </div>
                <span className="nelvyon-integrations-hub__node-label">{item.name}</span>
                <span className={`nelvyon-integrations-hub__node-badge nelvyon-integrations-hub__node-badge--${item.status}`}>
                  {item.status === "available" ? "Disponible" : "Próximamente"}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="nelvyon-integrations-hub__mobile-groups">
          <div className="nelvyon-integrations-hub__mobile-group">
            <p className="nelvyon-integrations-hub__mobile-group-title">Disponible</p>
            <div className="nelvyon-integrations-hub__pills">
              {AVAILABLE.map((item) => (
                <span key={item.name} className="nelvyon-integrations-hub__pill nelvyon-integrations-hub__pill--available">
                  {item.name}
                </span>
              ))}
            </div>
          </div>
          <div className="nelvyon-integrations-hub__mobile-group">
            <p className="nelvyon-integrations-hub__mobile-group-title">Próximamente</p>
            <div className="nelvyon-integrations-hub__pills">
              {COMING.map((item) => (
                <span key={item.name} className="nelvyon-integrations-hub__pill nelvyon-integrations-hub__pill--coming">
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
