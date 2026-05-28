import Link from "next/link";

import { NelvyonMarketingShell } from "../marketing-shell";

const services = [
  {
    id: "crm",
    title: "CRM & Pipeline",
    desc: "Centraliza contactos, oportunidades y seguimiento comercial en un solo panel.",
    features: ["Pipeline visual", "Etiquetas y segmentos", "Historial de actividad", "Importación masiva"],
    plan: "Incluido desde Starter €97/mes",
  },
  {
    id: "email",
    title: "Email Marketing",
    desc: "Campañas, secuencias y automatizaciones que convierten leads en clientes.",
    features: ["Editor visual", "A/B testing", "Plantillas", "Métricas de apertura"],
    plan: "Incluido desde Starter €97/mes",
  },
  {
    id: "automation",
    title: "Automatizaciones",
    desc: "Flujos sin código que conectan CRM, email, pagos y notificaciones.",
    features: ["Triggers personalizados", "Acciones múltiples", "Condiciones", "Logs de ejecución"],
    plan: "Growth €297/mes",
  },
  {
    id: "pagos",
    title: "Pagos & Facturación",
    desc: "Cobra a tus clientes, emite facturas y controla ingresos recurrentes.",
    features: ["Stripe integrado", "Facturas PDF", "Suscripciones", "Recordatorios de pago"],
    plan: "Growth €297/mes",
  },
  {
    id: "funnels",
    title: "Funnels & Webs",
    desc: "Landing pages, embudos de venta y sitios web listos para captar leads.",
    features: ["Editor drag & drop", "Formularios", "Dominios propios", "SSL incluido"],
    plan: "Growth €297/mes",
  },
  {
    id: "analytics",
    title: "Analíticas",
    desc: "Dashboards en tiempo real de leads, ingresos, campañas y rendimiento.",
    features: ["KPIs personalizados", "Exportación", "Informes automáticos", "Multi-workspace"],
    plan: "Todos los planes",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business",
    desc: "Mensajería automatizada y atención al cliente desde la plataforma.",
    features: ["Plantillas aprobadas", "Respuestas automáticas", "Historial unificado", "Asignación a agentes"],
    plan: "Growth €297/mes",
  },
  {
    id: "ads",
    title: "Gestión de Anuncios",
    desc: "Conecta Meta, Google y TikTok Ads para gestionar campañas y métricas.",
    features: ["Sincronización de leads", "Reportes unificados", "Presupuestos", "Alertas de rendimiento"],
    plan: "Growth €297/mes",
  },
];

export function NelvyonServiciosPage() {
  return (
    <NelvyonMarketingShell>
      <section
        className="px-4 py-16 text-center lg:px-6"
        style={{ background: "linear-gradient(180deg, #07122a 0%, #0084fc 100%)" }}
      >
        <h1 className="text-4xl font-bold text-white md:text-5xl">Servicios NELVYON</h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/70">
          Todo lo que tu agencia necesita para captar, convertir y retener clientes — en una sola plataforma.
        </p>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 lg:px-6">
        {services.map((s, i) => (
          <article
            key={s.id}
            id={s.id}
            className={`grid gap-8 rounded-2xl border border-[#e8eef8] bg-white p-8 shadow-sm lg:grid-cols-2 ${
              i % 2 === 1 ? "lg:flex-row-reverse" : ""
            }`}
          >
            <div>
              <h2 className="text-2xl font-bold text-[#07122a]">{s.title}</h2>
              <p className="mt-3 text-[#07122a]/70">{s.desc}</p>
              <ul className="mt-4 space-y-2 text-sm text-[#07122a]/80">
                {s.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#0084fc]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-semibold text-[#0084fc]">{s.plan}</p>
              <Link
                href="/registro"
                className="mt-6 inline-block rounded-lg bg-[#0084fc] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0084fc]/90"
              >
                Empezar gratis
              </Link>
            </div>
            <div className="flex min-h-[180px] items-center justify-center rounded-xl bg-[#f8faff] border border-[#e8eef8]">
              <div className="h-24 w-full max-w-xs rounded-lg bg-gradient-to-r from-[#0084fc]/20 to-[#00d6fe]/20 p-4">
                <div className="h-3 w-2/3 rounded bg-[#0084fc]/40" />
                <div className="mt-3 space-y-2">
                  <div className="h-2 rounded bg-[#e8eef8]" />
                  <div className="h-2 w-4/5 rounded bg-[#e8eef8]" />
                  <div className="h-2 w-3/5 rounded bg-[#e8eef8]" />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </NelvyonMarketingShell>
  );
}
