import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBolt,
  IconBrandGoogle,
  IconBrandInstagram,
  IconBrandMeta,
  IconBrandWhatsapp,
  IconChartBar,
  IconCreditCard,
  IconMail,
  IconShoppingCart,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";

const CAPABILITIES: { name: string; Icon: TablerIcon }[] = [
  { name: "CRM y ventas", Icon: IconUsers },
  { name: "Campañas", Icon: IconMail },
  { name: "Automatización", Icon: IconWebhook },
  { name: "Reporting", Icon: IconChartBar },
  { name: "E-commerce", Icon: IconShoppingCart },
];

const PLATFORMS: { name: string; Icon: TablerIcon; color: string; bg: string }[] = [
  { name: "Meta", Icon: IconBrandMeta, color: "#1877f2", bg: "rgba(24,119,242,0.15)" },
  { name: "Google", Icon: IconBrandGoogle, color: "#ea4335", bg: "rgba(234,67,53,0.12)" },
  { name: "WhatsApp", Icon: IconBrandWhatsapp, color: "#25d366", bg: "rgba(37,211,102,0.12)" },
  { name: "Instagram", Icon: IconBrandInstagram, color: "#e4405f", bg: "rgba(228,64,95,0.12)" },
  { name: "Zapier", Icon: IconBolt, color: "#ff4a00", bg: "rgba(255,74,0,0.12)" },
  { name: "Stripe", Icon: IconCreditCard, color: "#635bff", bg: "rgba(99,91,255,0.12)" },
];

export function NvPlatformStrip() {
  return (
    <section className="nv-strip" aria-label="Capacidades y plataformas">
      <div className="nv-container">
        <p className="nv-strip__caption">Capacidades operativas en un solo entorno</p>
        <div className="nv-strip__caps">
          {CAPABILITIES.map((item) => (
            <div key={item.name} className="nv-strip__cap">
              <item.Icon size={16} stroke={1.75} aria-hidden />
              {item.name}
            </div>
          ))}
        </div>
        <div className="nv-strip__divider" aria-hidden />
        <p className="nv-strip__caption nv-strip__caption--sub">Conecta con las plataformas que ya usas</p>
        <div className="nv-strip__items">
          {PLATFORMS.map((item) => (
            <div key={item.name} className="nv-strip__item">
              <span className="nv-strip__icon" style={{ background: item.bg }}>
                <item.Icon size={22} stroke={1.5} color={item.color} aria-hidden />
              </span>
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
