import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonTable } from "@/components/agenforce/comparison-table";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { NavyToWhiteTransition } from "@/components/agenforce/section-transition";
export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de Marketing Automatizado",
  description: "NELVYON SaaS: plataforma operativa con agentes expertos para centralizar marketing, ventas, contenidos, automatización y reporting.",
};
const plans = [
  {
    name: "Starter",
    price: "€97",
    period: "/mes",
    description: "Para empresas que quieren empezar a centralizar procesos básicos de marketing, CRM, publicaciones y reporting con mayor orden y visibilidad.",
    features: ["1 canal publicitario gestionado", "Dashboard unificado", "WhatsApp automático (500 msg/mes)", "Email Marketing básico", "Soporte por chat", "1 usuario"],
    cta: "Empezar ahora",
    highlight: false,
  },
  {
    name: "Growth",
    price: "€297",
    period: "/mes",
    description: "Para empresas que necesitan una operación más completa con agentes expertos, automatizaciones, campañas, contenido y seguimiento comercial.",
    features: ["Meta + Google + TikTok Ads", "Dashboard avanzado + Analytics", "WhatsApp automático (5.000 msg/mes)", "Email Marketing con A/B testing", "CRM integrado", "Soporte prioritario 24/7", "5 usuarios", "1 web NELVYON OS/mes"],
    cta: "Empezar ahora",
    highlight: true,
    badge: "Más popular",
  },
  {
    name: "Elite",
    price: "€797",
    period: "/mes",
    description: "Para empresas, agencias o estructuras complejas que necesitan módulos avanzados, integraciones, reporting amplio y soporte estratégico.",
    features: ["Canales ilimitados", "Dashboard enterprise + BI", "WhatsApp ilimitado", "Email Marketing enterprise", "CRM avanzado + Pipelines Kanban", "Account Manager dedicado", "Usuarios ilimitados", "NELVYON OS ilimitado", "API access completo", "SLA 99.9% uptime"],
    cta: "Contactar ventas",
    highlight: false,
  },
];
const saasFeatures = [
  { icon: "📊", title: "Dashboard Central", desc: "Vista unificada para consultar campañas, contactos, tareas, oportunidades, automatizaciones, contenidos y métricas principales sin saltar entre herramientas." },
  { icon: "📣", title: "Agente de Ads", desc: "Agente experto para apoyar la creación, revisión y coordinación de campañas publicitarias: estructura, mensajes, audiencias y seguimiento operativo." },
  { icon: "✉️", title: "Agente de Email", desc: "Agente experto para secuencias, newsletters, mensajes comerciales, segmentación, calendarios y flujos automatizados de email." },
  { icon: "✍️", title: "Agente de Contenidos", desc: "Agente experto para generar artículos, publicaciones, copies, guiones y piezas adaptadas a la voz de marca de forma organizada y coherente." },
  { icon: "🔍", title: "Agente de SEO", desc: "Agente experto para revisar oportunidades orgánicas, apoyar investigación de palabras clave, proponer estructuras de contenido y monitorizar tareas SEO." },
  { icon: "📋", title: "CRM Visual Kanban", desc: "Pipeline visual para organizar oportunidades, contactos, fases comerciales, tareas y seguimiento con mayor claridad operativa." },
  { icon: "📱", title: "Social Publishing", desc: "Módulo para planificar, organizar y programar publicaciones en redes sociales desde un entorno centralizado." },
  { icon: "💬", title: "Agente de WhatsApp", desc: "Agente experto para automatizar conversaciones, cualificación inicial, respuestas frecuentes y seguimiento en WhatsApp integrado con CRM." },
  { icon: "🎨", title: "Creative Studio", desc: "Entorno para desarrollar piezas, variantes de anuncios y activos creativos para campañas o redes sociales alineados con la identidad de marca." },
  { icon: "🔗", title: "Attribution Engine", desc: "Módulo para analizar el recorrido de los contactos y entender la relación entre canales, campañas e interacciones para tomar mejores decisiones." },
  { icon: "🌐", title: "Landing Page Builder", desc: "Constructor de páginas de captación con plantillas, formularios, secciones editables y conexión directa con CRM." },
  { icon: "🎓", title: "NELVYON Academy", desc: "Área de formación con recursos para entender la plataforma, mejorar procesos internos y adoptar los módulos con mayor autonomía." },
  { icon: "🤝", title: "Agency Partner Portal", desc: "Portal para agencias: gestión multi-cliente, espacios por cliente, reporting, módulos operativos y opciones white-label." },
  { icon: "🛒", title: "E-commerce Connectors", desc: "Conectores para tiendas online que permiten sincronizar información, automatizaciones, flujos de recuperación y campañas." },
  { icon: "📈", title: "Reportes y Dashboards", desc: "Módulo para crear paneles, informes y resúmenes de actividad sin depender de informes manuales dispersos." },
  { icon: "🔌", title: "Integraciones API", desc: "Conexión con herramientas externas mediante integraciones, webhooks o flujos personalizados adaptados al ecosistema tecnológico de cada empresa." },
];
export default function SaasPage() {
  return (
    <main style={{ paddingTop: "68px" }}>
      <section style={{ backgroundColor: "#07122a", padding: "64px 0 0" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#00d6fe", marginBottom: "16px" }}>NELVYON SaaS Platform</p>
          <h1 className="fade-in" style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.1 }}>
            La plataforma operativa de NELVYON
          </h1>
          <p style={{ fontSize: "18px", color: "#a8c8e8", margin: "0 0 16px", lineHeight: 1.6 }}>
            Un SaaS diseñado para centralizar marketing, ventas, contenidos, automatización y reporting mediante agentes expertos.
          </p>
          <p style={{ fontSize: "16px", color: "#a8c8e8", margin: "0 0 36px", lineHeight: 1.6 }}>
            NELVYON SaaS permite a las empresas trabajar con un entorno más ordenado, automatizado y preparado para operaciones continuas.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="#precios" style={{ display: "inline-block", backgroundColor: "#0084fc", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none" }}>
              Ver planes →
            </Link>
            <Link href="/contacto" style={{ display: "inline-block", backgroundColor: "transparent", color: "#ffffff", fontWeight: 700, fontSize: "16px", padding: "16px 40px", borderRadius: "12px", textDecoration: "none", border: "2px solid rgba(255,255,255,0.3)" }}>
              Solicitar demo
            </Link>
          </div>
        </div>
        <NavyToWhiteTransition />
      </section>
      <section style={{ backgroundColor: "#f8faff", padding: "48px 0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 16px" }}>
            La mayoría de equipos utilizan demasiadas herramientas desconectadas: una para campañas, otra para contactos, otra para emails, otra para informes, otra para tareas y otra para publicar contenido.
          </p>
          <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>
            NELVYON SaaS busca reducir esa fragmentación mediante una plataforma central que conecta módulos, datos, flujos y agentes expertos. El sistema no elimina la necesidad de criterio. La organiza, la ejecuta y la mantiene operativa.
          </p>
        </div>
      </section>
      <section style={{ backgroundColor: "#ffffff", padding: "64px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 className="fade-in" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>Módulos de la plataforma</h2>
            <p style={{ fontSize: "18px", color: "#5a6a8a", maxWidth: "540px", margin: "0 auto" }}>16 módulos para operar marketing, ventas y automatización desde un entorno central.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {saasFeatures.map((f, i) => (
              <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "20px", padding: "32px", display: "flex", gap: "16px" }}>
                <span style={{ fontSize: "32px", flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#07122a", margin: "0 0 8px" }}>{f.title}</h3>
                  <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="precios" style={{ backgroundColor: "#f8faff", padding: "64px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>Precios transparentes</p>
            <h2 className="fade-in" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 16px" }}>Elige tu plan</h2>
            <p style={{ fontSize: "18px", color: "#5a6a8a" }}>Sin permanencia. Sin sorpresas. Cancela cuando quieras.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", alignItems: "start" }}>
            {plans.map((plan, i) => (
              <div key={i} style={{ backgroundColor: plan.highlight ? "#07122a" : "#ffffff", border: plan.highlight ? "2px solid #0084fc" : "1px solid #e8eef8", borderRadius: "24px", padding: "40px", position: "relative", boxShadow: plan.highlight ? "0 20px 60px rgba(0,132,252,0.25)" : "0 4px 20px rgba(7,18,42,0.06)" }}>
                {plan.badge && (
                  <span style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#0084fc", color: "#fff", fontSize: "12px", fontWeight: 700, borderRadius: "20px", padding: "4px 16px", whiteSpace: "nowrap" }}>
                    {plan.badge}
                  </span>
                )}
                <h3 style={{ fontSize: "22px", fontWeight: 800, color: plan.highlight ? "#ffffff" : "#07122a", margin: "0 0 8px" }}>{plan.name}</h3>
                <p style={{ fontSize: "14px", color: plan.highlight ? "#a8c8e8" : "#6b7a99", margin: "0 0 24px" }}>{plan.description}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "32px" }}>
                  <span style={{ fontSize: "52px", fontWeight: 900, color: plan.highlight ? "#ffffff" : "#07122a", lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: "16px", color: plan.highlight ? "#a8c8e8" : "#6b7a99" }}>{plan.period}</span>
                </div>
                <ul style={{ margin: "0 0 32px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {plan.features.map((f, fi) => (
                    <li key={fi} style={{ fontSize: "14px", color: plan.highlight ? "#d0e8f8" : "#374151", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "#0084fc", fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/contacto" style={{ display: "block", textAlign: "center", backgroundColor: plan.highlight ? "#0084fc" : "#07122a", color: "#ffffff", fontWeight: 700, fontSize: "15px", padding: "14px 24px", borderRadius: "12px", textDecoration: "none" }}>
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ComparisonTable />
      <CtaFinal
        title="Una plataforma para operar con continuidad"
        subtitle="Centraliza procesos, activa agentes expertos y trabaja con una estructura digital preparada para crecer con tu empresa."
        primaryLabel="Ver plataforma"
        primaryHref="/saas#precios"
        showSecondary={false}
      />
    </main>
  );
}
