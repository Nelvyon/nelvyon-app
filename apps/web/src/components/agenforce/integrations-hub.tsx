"use client";

import Image from "next/image";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBrandGoogle,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandMeta,
  IconBrandTiktok,
  IconBrandWhatsapp,
  IconBrandWordpress,
  IconCalendar,
  IconChartBar,
  IconCreditCard,
  IconMail,
  IconShoppingCart,
  IconUsers,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type IntegrationNode = {
  name: string;
  Icon: TablerIcon;
  color: string;
  bg: string;
  angle: number;
};

const INTEGRATIONS: IntegrationNode[] = [
  { name: "Meta", Icon: IconBrandMeta, color: "#1877f2", bg: "rgba(24,119,242,0.14)", angle: 0 },
  { name: "Google", Icon: IconBrandGoogle, color: "#ea4335", bg: "rgba(234,67,53,0.12)", angle: 28 },
  { name: "TikTok", Icon: IconBrandTiktok, color: "#ffffff", bg: "rgba(255,255,255,0.08)", angle: 56 },
  { name: "Instagram", Icon: IconBrandInstagram, color: "#e4405f", bg: "rgba(228,64,95,0.12)", angle: 84 },
  { name: "LinkedIn", Icon: IconBrandLinkedin, color: "#0a66c2", bg: "rgba(10,102,194,0.12)", angle: 112 },
  { name: "WhatsApp", Icon: IconBrandWhatsapp, color: "#25d366", bg: "rgba(37,211,102,0.12)", angle: 140 },
  { name: "Email", Icon: IconMail, color: NELVYON_BLUE, bg: "rgba(0,132,252,0.12)", angle: 168 },
  { name: "CRM", Icon: IconUsers, color: NELVYON_BLUE, bg: "rgba(0,132,252,0.12)", angle: 196 },
  { name: "Stripe", Icon: IconCreditCard, color: "#635bff", bg: "rgba(99,91,255,0.12)", angle: 224 },
  { name: "Shopify", Icon: IconShoppingCart, color: "#96bf48", bg: "rgba(150,191,72,0.12)", angle: 252 },
  { name: "WooCommerce", Icon: IconBrandWordpress, color: "#96588a", bg: "rgba(150,88,138,0.12)", angle: 280 },
  { name: "Calendario", Icon: IconCalendar, color: NELVYON_BLUE, bg: "rgba(0,132,252,0.12)", angle: 308 },
  { name: "Reporting", Icon: IconChartBar, color: NELVYON_BLUE, bg: "rgba(0,132,252,0.12)", angle: 336 },
];

const HUB_RADIUS = 42;
const NODE_RADIUS = 38;

function polarToPercent(angleDeg: number, radiusPercent: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: 50 + radiusPercent * Math.cos(rad),
    y: 50 + radiusPercent * Math.sin(rad),
  };
}

export function IntegrationsHub() {
  return (
    <section className="nelvyon-integrations-hub" aria-labelledby="integrations-hub-title">
      <div className="nelvyon-integrations-hub__glow" aria-hidden />
      <div className="nelvyon-integrations-hub__inner">
        <header className="nelvyon-integrations-hub__head">
          <p className="mkt-eyebrow nelvyon-integrations-hub__eyebrow">Integraciones</p>
          <h2 id="integrations-hub-title" className="mkt-h2 mkt-h2--display mkt-h2--light fade-in">
            Conecta tus herramientas. Centraliza tu operación.
          </h2>
          <p className="mkt-lead--light nelvyon-integrations-hub__lead fade-in">
            Canales, pagos, CRM y reporting conectados hacia un entorno operativo único.
          </p>
        </header>

        <div className="nelvyon-integrations-hub__stage" role="img" aria-label="Integraciones conectadas a NELVYON">
          <svg className="nelvyon-integrations-hub__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
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
                  stroke={NELVYON_BLUE}
                  strokeOpacity={0.28}
                  strokeWidth="0.35"
                />
              );
            })}
          </svg>

          <div className="nelvyon-integrations-hub__core">
            <div className="nelvyon-integrations-hub__core-ring" aria-hidden />
            <Image src="/logo.png" alt="" width={40} height={40} className="nelvyon-integrations-hub__logo" />
            <span className="nelvyon-integrations-hub__brand">NELVYON</span>
          </div>

          {INTEGRATIONS.map((item) => {
            const pos = polarToPercent(item.angle, NODE_RADIUS);
            return (
              <div
                key={item.name}
                className="nelvyon-integrations-hub__node"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div className="nelvyon-integrations-hub__node-icon" style={{ background: item.bg }}>
                  <item.Icon size={20} stroke={1.5} color={item.color} aria-hidden />
                </div>
                <span className="nelvyon-integrations-hub__node-label">{item.name}</span>
              </div>
            );
          })}
        </div>

        <div className="nelvyon-integrations-hub__pills" aria-hidden>
          {INTEGRATIONS.map((item) => (
            <span key={`pill-${item.name}`} className="nelvyon-integrations-hub__pill">
              {item.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
