"use client";

import Image from "next/image";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconChartBar,
  IconMail,
  IconSettings,
  IconSpeakerphone,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type OrbitNode = {
  label: string;
  desc: string;
  Icon: TablerIcon;
  x: string;
  y: string;
};

const NODES: OrbitNode[] = [
  { label: "Marketing", desc: "Campañas y contenidos conectados.", Icon: IconSpeakerphone, x: "50%", y: "6%" },
  { label: "Ventas", desc: "CRM y pipeline comercial.", Icon: IconUsers, x: "88%", y: "28%" },
  { label: "Automatización", desc: "Flujos y secuencias operativas.", Icon: IconWebhook, x: "88%", y: "72%" },
  { label: "Comunicación", desc: "Email y mensajería integrados.", Icon: IconMail, x: "50%", y: "94%" },
  { label: "Reportes", desc: "Paneles y seguimiento unificado.", Icon: IconChartBar, x: "12%", y: "72%" },
  { label: "Operación", desc: "Continuidad y coordinación diaria.", Icon: IconSettings, x: "12%", y: "28%" },
];

export function PlataformaOs() {
  return (
    <section className="nelvyon-diagram-section nelvyon-home-ecosystem nelvyon-mkt-section--airy">
      <div className="nelvyon-diagram-section__inner">
        <header className="nelvyon-diagram-section__header">
          <h2 className="mkt-h2 mkt-h2--display fade-in">Ecosistema NELVYON</h2>
          <p className="mkt-lead nelvyon-diagram-section__lead">
            Un ecosistema conectado para operar marketing, ventas y automatización con continuidad.
          </p>
        </header>

        <div className="nelvyon-ecosystem-orbit" role="img" aria-label="Diagrama del ecosistema NELVYON">
          <svg className="nelvyon-ecosystem-orbit__svg" viewBox="0 0 800 800" aria-hidden>
            <circle cx="400" cy="400" r="300" fill="none" stroke="rgba(7,18,42,0.07)" strokeWidth="1" />
            <circle cx="400" cy="400" r="248" fill="none" stroke="rgba(0,132,252,0.16)" strokeWidth="1" strokeDasharray="6 10" />
            <circle cx="400" cy="400" r="196" fill="none" stroke="rgba(7,18,42,0.05)" strokeWidth="1" strokeDasharray="4 12" />
            {NODES.map((node) => {
              const px = (parseFloat(node.x) / 100) * 800;
              const py = (parseFloat(node.y) / 100) * 800;
              return (
                <line
                  key={`line-${node.label}`}
                  x1="400"
                  y1="400"
                  x2={px}
                  y2={py}
                  stroke={NELVYON_BLUE}
                  strokeOpacity={0.22}
                  strokeWidth="1.25"
                />
              );
            })}
          </svg>

          <div className="nelvyon-ecosystem-orbit__core">
            <Image src="/logo.png" alt="" width={56} height={56} className="nelvyon-ecosystem-orbit__logo" priority={false} />
            <span className="nelvyon-ecosystem-orbit__brand">NELVYON</span>
          </div>

          {NODES.map((node) => (
            <div
              key={node.label}
              className="nelvyon-ecosystem-orbit__node"
              style={{ left: node.x, top: node.y }}
            >
              <div className="nelvyon-ecosystem-orbit__node-icon" aria-hidden>
                <node.Icon size={22} stroke={1.5} color={NELVYON_BLUE} />
              </div>
              <p className="nelvyon-ecosystem-orbit__node-title">{node.label}</p>
              <p className="nelvyon-ecosystem-orbit__node-desc">{node.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
