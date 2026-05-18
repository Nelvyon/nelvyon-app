"use client";

import { SupportCenterBody } from "@/components/support/SupportWidget";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const FAQ = [
  {
    q: "¿Cómo cancelo mi suscripción?",
    a: "Ve a Dashboard → Configuración → Suscripción y facturación. Ahí puedes iniciar la cancelación; el acceso sigue activo hasta el fin del periodo pagado.",
  },
  {
    q: "¿Dónde encuentro mis facturas?",
    a: "En Dashboard → Configuración → Facturación. Paddle envía también un email con cada cobro; revisa spam si no lo ves.",
  },
  {
    q: "¿Cuánto tarda un agente de IA?",
    a: "Normalmente entre 30 y 120 segundos según cola y complejidad. Si supera 5 minutos en procesando, abre un ticket técnico con el ID del job.",
  },
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí, desde Dashboard → Configuración → Plan. El cambio es inmediato y el importe se prorratea según Paddle.",
  },
  {
    q: "¿Tienen API pública?",
    a: "Sí. Genera API keys en Dashboard → API Keys y consulta la documentación de límites por plan. Los 429 indican rate limit.",
  },
];

export default function SupportDashboardPage() {
  return (
    <DashboardLayout>
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Centro de Ayuda</h1>
        <p className="text-lg text-slate-600">Estamos aquí para ayudarte</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">FAQ rápida</h2>
        <dl className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="font-medium text-slate-900">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Crear ticket y mis tickets</h2>
        <p className="text-sm text-slate-600">Elige una categoría, una plantilla si aplica, y envía tu consulta. Puedes revisar el historial abajo.</p>
        <SupportCenterBody embedded />
      </section>
    </div>
    </DashboardLayout>
  );
}
