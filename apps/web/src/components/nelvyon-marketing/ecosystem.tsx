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

type Node = { label: string; desc: string; Icon: TablerIcon; x: string; y: string };

const NODES: Node[] = [
  { label: "Marketing", desc: "Campañas y contenidos.", Icon: IconSpeakerphone, x: "50%", y: "8%" },
  { label: "Ventas", desc: "CRM y pipeline.", Icon: IconUsers, x: "86%", y: "30%" },
  { label: "Automatización", desc: "Flujos operativos.", Icon: IconWebhook, x: "86%", y: "70%" },
  { label: "Comunicación", desc: "Email y mensajería.", Icon: IconMail, x: "50%", y: "92%" },
  { label: "Reportes", desc: "Paneles unificados.", Icon: IconChartBar, x: "14%", y: "70%" },
  { label: "Operación", desc: "Coordinación diaria.", Icon: IconSettings, x: "14%", y: "30%" },
];

export function NvEcosystem() {
  return (
    <>
      <div className="nv-ecosystem" role="img" aria-label="Ecosistema NELVYON conectado">
        <svg className="nv-ecosystem__svg" viewBox="0 0 800 800" aria-hidden>
          <circle cx="400" cy="400" r="280" fill="none" stroke="rgba(7,18,42,0.07)" strokeWidth="1" />
          <circle cx="400" cy="400" r="230" fill="none" stroke="rgba(0,132,252,0.16)" strokeWidth="1" strokeDasharray="6 10" />
          {NODES.map((n) => {
            const px = (parseFloat(n.x) / 100) * 800;
            const py = (parseFloat(n.y) / 100) * 800;
            return (
              <line key={n.label} x1="400" y1="400" x2={px} y2={py} stroke="#0084fc" strokeOpacity={0.22} strokeWidth="1.25" />
            );
          })}
        </svg>
        <div className="nv-ecosystem__core">
          <Image src="/logo.png" alt="" width={52} height={52} className="object-contain" />
          <span>NELVYON</span>
        </div>
        {NODES.map((n) => (
          <div key={n.label} className="nv-ecosystem__node" style={{ left: n.x, top: n.y }}>
            <div className="nv-ecosystem__node-dot">
              <n.Icon size={22} stroke={1.5} aria-hidden />
            </div>
            <strong>{n.label}</strong>
            <span>{n.desc}</span>
          </div>
        ))}
      </div>
      <div className="nv-ecosystem-mobile" aria-label="Áreas del ecosistema NELVYON">
        {NODES.map((n) => (
          <article key={n.label} className="nv-card">
            <div className="nv-card__icon">
              <n.Icon size={22} stroke={1.5} aria-hidden />
            </div>
            <h3>{n.label}</h3>
            <p>{n.desc}</p>
          </article>
        ))}
      </div>
    </>
  );
}
