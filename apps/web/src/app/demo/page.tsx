import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Demo gratuita — Nelvyon SaaS | Prueba 14 días sin tarjeta",
  description: "Prueba Nelvyon gratis 14 días. CRM, email marketing, SEO, publicidad, redes sociales, 193 agentes IA y mucho más. Sin tarjeta de crédito.",
};

const FEATURES = [
  { icon: "👥", title: "CRM ilimitado", desc: "Contactos, pipeline, deals y actividades" },
  { icon: "📧", title: "Email Marketing", desc: "Campañas visuales con editor Tiptap" },
  { icon: "💬", title: "SMS + WhatsApp", desc: "Envíos masivos a tus contactos" },
  { icon: "📱", title: "Redes Sociales", desc: "Publica en IG, FB, Twitter, LinkedIn, TikTok" },
  { icon: "💰", title: "Publicidad Digital", desc: "Google Ads, Meta Ads, TikTok Ads" },
  { icon: "🔍", title: "SEO & Posicionamiento", desc: "Tracking de keywords y auditoría técnica" },
  { icon: "⚡", title: "193 Agentes IA", desc: "Especialistas IA para cada área de marketing" },
  { icon: "🚀", title: "Funnel Builder", desc: "Embudos de conversión multipaso" },
  { icon: "🌐", title: "Web Builder", desc: "Landing pages sin código" },
  { icon: "🎓", title: "LMS — Cursos", desc: "Crea y vende cursos online" },
  { icon: "🎫", title: "Helpdesk", desc: "Tickets de soporte para tus clientes" },
  { icon: "🤝", title: "Afiliados", desc: "Programa de comisiones recurrentes" },
];

const STEPS = [
  { n: "1", title: "Regístrate gratis", desc: "Crea tu cuenta en 30 segundos, sin tarjeta" },
  { n: "2", title: "Importa tus contactos", desc: "Sube tu lista CSV o conecta tu CRM actual" },
  { n: "3", title: "Activa tu primer módulo", desc: "Email, SEO, Ads o Agentes IA — tú decides" },
  { n: "4", title: "Resultados desde el día 1", desc: "La IA trabaja 24/7 mientras tú te centras en crecer" },
];

const TESTIMONIALS = [
  { name: "Carlos M.", role: "CEO · Agencia Digital", text: "Sustituí HubSpot (800€/mes) y GoHighLevel (500€/mes) por Nelvyon. Pago 297€ y tengo todo mucho más claro y rápido.", plan: "Pro 297€/mes" },
  { name: "Laura S.", role: "Freelance Marketing", text: "Los 193 agentes IA me ahorran 20 horas a la semana. Es como tener un equipo entero a mi disposición.", plan: "Pro 297€/mes" },
  { name: "Marcos R.", role: "Director Marketing B2B", text: "El Asistente IA responde cualquier pregunta de marketing en segundos. Mejor que contratar un consultor.", plan: "Agency 797€/mes" },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#020817] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-24 text-center sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,132,255,0.12),transparent_60%)]" />
        <div className="mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0084FF]/30 bg-[#0084FF]/10 px-4 py-1.5 text-sm font-medium text-[#0084FF]">
            14 días gratis · Sin tarjeta · Cancela cuando quieras
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Prueba Nelvyon<br />
            <span className="text-[#0084FF]">completamente gratis</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            La plataforma de marketing digital con IA más completa del mercado. Mejor que HubSpot + GoHighLevel combinados.
            24 módulos, 193 agentes IA, todo en uno.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-2xl bg-[#0084FF] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#0084FF]/25 transition-all hover:bg-[#0066cc] hover:shadow-[#0084FF]/40">
              Empezar gratis — 14 días →
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-8 py-4 text-base font-medium text-white/80 transition-all hover:border-white/40 hover:text-white">
              Ver precios
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/40">No se requiere tarjeta de crédito · Acceso inmediato completo</p>
        </div>
      </section>

      {/* 12 features grid */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-center text-sm font-medium uppercase tracking-widest text-[#0084FF]">Todo incluido en tu prueba</p>
          <h2 className="mb-12 text-center text-3xl font-bold text-white">24 módulos. Todo activado desde el día 1.</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:border-[#0084FF]/30">
                <span className="text-2xl">{f.icon}</span>
                <p className="mt-3 font-semibold text-white">{f.title}</p>
                <p className="mt-1 text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-[#0084FF]/30 bg-[#0084FF]/10 p-5 flex flex-col items-center justify-center text-center">
              <p className="text-3xl font-bold text-[#0084FF]">+12</p>
              <p className="mt-1 text-sm font-medium text-white/70">módulos más incluidos</p>
              <p className="mt-2 text-xs text-white/50">Dialer, Loyalty, Reportes, Integraciones…</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">Empieza en 4 pasos</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0084FF] text-base font-bold text-white">
                  {s.n}
                </div>
                <div>
                  <p className="font-semibold text-white">{s.title}</p>
                  <p className="mt-1 text-sm text-white/60">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-white">Lo que dicen nuestros clientes</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm leading-relaxed text-white/80">"{t.text}"</p>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/50">{t.role}</p>
                  <span className="mt-2 inline-block rounded-full bg-[#0084FF]/20 px-2.5 py-0.5 text-xs font-medium text-[#0084FF]">{t.plan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vs competition */}
      <section className="px-4 py-16 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-3xl font-bold text-white">¿Por qué no HubSpot o GoHighLevel?</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              { competitor: "HubSpot", price: "800€+/mes", issues: "Demasiado complejo · Sin IA real · Caro", highlight: false },
              { competitor: "GoHighLevel", price: "497$/mes", issues: "Solo para agencias · UX complicada · Sin IA", highlight: false },
              { competitor: "Nelvyon", price: "97–797€/mes", issues: "Todo en uno · IA real · Más fácil · Precio justo", highlight: true },
            ]).map((c) => (
              <div key={c.competitor} className={`rounded-2xl border p-5 ${c.highlight ? "border-[#0084FF]/50 bg-[#0084FF]/10" : "border-white/10 bg-white/5"}`}>
                <p className={`text-lg font-bold ${c.highlight ? "text-[#0084FF]" : "text-white/70"}`}>{c.competitor}</p>
                <p className={`mt-1 text-xl font-bold ${c.highlight ? "text-white" : "text-white/50"}`}>{c.price}</p>
                <p className={`mt-2 text-xs ${c.highlight ? "text-white/80" : "text-white/40"}`}>{c.issues}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Prueba Nelvyon gratis.<br />Sin riesgos. Sin tarjeta.
          </h2>
          <p className="mt-4 text-lg text-white/60">
            14 días de acceso completo a todos los módulos. Si no te convence, cancelas con un clic.
          </p>
          <div className="mt-8">
            <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-2xl bg-[#0084FF] px-10 py-4 text-lg font-semibold text-white shadow-xl shadow-[#0084FF]/30 transition-all hover:bg-[#0066cc]">
              Empezar gratis ahora →
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/40">Sin tarjeta · Configuración en 2 minutos · Cancela cuando quieras</p>
        </div>
      </section>
    </main>
  );
}
