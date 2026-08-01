import type { ReactNode } from "react";

import type { ProductMockVariant } from "../content/catalog";

export type { ProductMockVariant };

type MockDef = {
  path: string;
  nav: string[];
  active: number;
  title: string;
  eyebrow: string;
  body: ReactNode;
};

function Kpi({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-nv-display)] text-xl text-white">{value}</p>
      <p className="mt-1 text-[10px] text-emerald-400">{delta}</p>
    </div>
  );
}

function Rows({ items }: { items: string[] }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((row) => (
        <div key={row} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2">
          <span className="truncate text-[11px] text-slate-300">{row}</span>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0084ff]" />
        </div>
      ))}
    </div>
  );
}

function Bars({ items }: { items: { label: string; w: string }[] }) {
  return (
    <div className="mt-4 space-y-3">
      {items.map((bar) => (
        <div key={bar.label}>
          <div className="mb-1 flex justify-between text-[10px] text-slate-400">
            <span>{bar.label}</span>
            <span>{bar.w}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#0084ff]" style={{ width: bar.w }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const DEFS: Record<ProductMockVariant, MockDef> = {
  dashboard: {
    path: "/saas/dashboard",
    nav: ["Dashboard", "CRM", "Campañas", "Workflows", "Billing"],
    active: 0,
    title: "Dashboard comercial",
    eyebrow: "Operación",
    body: (
      <>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Kpi label="Pipeline" value="128" delta="+12%" />
          <Kpi label="Campañas" value="7" delta="+2" />
          <Kpi label="Workflows OK" value="99.2%" delta="SLA" />
        </div>
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
            <p className="text-[11px] font-semibold text-white">Actividad</p>
            <Rows items={["Campaña Growth · enviada", "Deal Aether · etapa propuesta", "Workflow lead → email"]} />
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
            <p className="text-[11px] font-semibold text-white">Salud</p>
            <Bars items={[{ label: "SES", w: "92%" }, { label: "Workflows", w: "88%" }, { label: "Portal", w: "95%" }]} />
          </div>
        </div>
      </>
    ),
  },
  crm: {
    path: "/saas/crm",
    nav: ["Dashboard", "CRM", "Pipeline", "Inbox"],
    active: 1,
    title: "Contactos",
    eyebrow: "CRM",
    body: (
      <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
        <div className="mb-3 flex gap-2 text-[10px] text-slate-400">
          <span className="rounded-full bg-[#0084ff]/20 px-2 py-1 text-[#4da3ff]">Todos</span>
          <span className="rounded-full bg-white/5 px-2 py-1">Empresas</span>
          <span className="rounded-full bg-white/5 px-2 py-1">Leads</span>
        </div>
        <Rows
          items={[
            "Ana López · Aether · MQL",
            "Carlos Ruiz · Nova · Cliente",
            "María Vidal · Orbit · SQL",
            "Luis Pérez · Helix · Lead",
          ]}
        />
      </div>
    ),
  },
  pipeline: {
    path: "/saas/pipeline",
    nav: ["CRM", "Pipeline", "Documentos"],
    active: 1,
    title: "Oportunidades",
    eyebrow: "Pipeline",
    body: (
      <div className="grid grid-cols-3 gap-2">
        {["Nuevo", "Propuesta", "Negociación"].map((col, i) => (
          <div key={col} className="rounded-xl border border-white/10 bg-[#0b1428] p-2">
            <p className="text-[10px] font-semibold text-slate-400">{col}</p>
            <div className="mt-2 space-y-2">
              {[1, 2].map((n) => (
                <div key={n} className="rounded-lg bg-white/[0.04] p-2">
                  <p className="text-[11px] text-white">Deal {col[0]}
                    {n}
                  </p>
                  <p className="text-[10px] text-emerald-400">€{(i + 1) * 4}{n}00</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  campaigns: {
    path: "/saas/campanias",
    nav: ["Campañas", "Secuencias", "Deliverability"],
    active: 0,
    title: "Campañas email",
    eyebrow: "Email",
    body: (
      <>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Kpi label="Enviados" value="12.4k" delta="30d" />
          <Kpi label="Open rate" value="38%" delta="+3pp" />
          <Kpi label="Clicks" value="4.1%" delta="OK" />
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <Rows items={["Onboarding · programada", "Reactivación · enviada", "Newsletter · borrador"]} />
        </div>
      </>
    ),
  },
  workflows: {
    path: "/saas/workflows",
    nav: ["Workflows", "Editor", "Logs"],
    active: 0,
    title: "Flujos activos",
    eyebrow: "Automatización",
    body: (
      <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
        <Rows
          items={[
            "Lead creado → email bienvenida",
            "Deal ganado → tarea CS",
            "No-show → recordatorio WhatsApp",
            "Score ≥ 70 → asignar owner",
          ]}
        />
        <Bars items={[{ label: "Éxito 24h", w: "97%" }, { label: "Idempotencia", w: "100%" }]} />
      </div>
    ),
  },
  inbox: {
    path: "/saas/inbox",
    nav: ["Inbox", "WhatsApp", "CRM"],
    active: 0,
    title: "Bandeja unificada",
    eyebrow: "Inbox",
    body: (
      <div className="grid gap-2 md:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <Rows items={["Ana · consulta demo", "Carlos · factura", "María · soporte"]} />
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <p className="text-[11px] font-semibold text-white">Hilo · Ana López</p>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Hola, quiero ver el módulo CRM en una demo esta semana…
          </p>
          <div className="mt-4 h-8 rounded-lg border border-white/10 bg-white/[0.03]" />
        </div>
      </div>
    ),
  },
  billing: {
    path: "/saas/billing",
    nav: ["Billing", "Facturas", "Plan"],
    active: 0,
    title: "Facturación",
    eyebrow: "Billing",
    body: (
      <>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Kpi label="Plan" value="Growth" delta="activo" />
          <Kpi label="MRR" value="€297" delta="Stripe" />
          <Kpi label="Estado" value="OK" delta="webhook" />
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <Rows items={["Inv-1042 · pagada", "Inv-1041 · pagada", "Próximo cobro · 1 ago"]} />
        </div>
      </>
    ),
  },
  ai: {
    path: "/saas/ai",
    nav: ["IA", "Agentes", "Autopilot"],
    active: 0,
    title: "Panel IA",
    eyebrow: "Gobierno",
    body: (
      <div className="grid gap-2.5 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <p className="text-[11px] font-semibold text-white">Flags</p>
          <Rows items={["Canary kill · ON", "Spend · OFF", "Publish · OFF"]} />
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <p className="text-[11px] font-semibold text-white">Últimas evidencias</p>
          <Rows items={["Eval pack QA 91", "Router latency OK", "RAG probe PASS"]} />
        </div>
      </div>
    ),
  },
  agentes: {
    path: "/saas/agentes",
    nav: ["Agentes", "IA", "Playbooks"],
    active: 0,
    title: "Agentes",
    eyebrow: "IA",
    body: (
      <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
        <Rows
          items={[
            "Copywriter · listo",
            "SEO draft · revisión humana",
            "Research · en cola",
            "QA pack · OK",
          ]}
        />
      </div>
    ),
  },
  analytics: {
    path: "/saas/reportes",
    nav: ["Reportes", "Atribución", "Benchmark"],
    active: 0,
    title: "Analytics",
    eyebrow: "Informes",
    body: (
      <>
        <Bars
          items={[
            { label: "Leads", w: "78%" },
            { label: "SQL", w: "54%" },
            { label: "Won", w: "31%" },
            { label: "Retención", w: "66%" },
          ]}
        />
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <Rows items={["Informe Growth · listo", "Atribución · tab activa"]} />
        </div>
      </>
    ),
  },
  calendar: {
    path: "/saas/citas",
    nav: ["Citas", "Calendario", "CRM"],
    active: 0,
    title: "Agenda",
    eyebrow: "Calendario",
    body: (
      <div className="grid grid-cols-4 gap-1.5">
        {["L", "M", "X", "J", "V", "S", "D", "1", "2", "3", "4", "5"].map((d, i) => (
          <div
            key={`${d}-${i}`}
            className={`rounded-lg border border-white/10 p-2 text-center text-[10px] ${
              i === 9 ? "bg-[#0084ff]/25 text-[#4da3ff]" : "bg-[#0b1428] text-slate-400"
            }`}
          >
            {d}
          </div>
        ))}
        <div className="col-span-4 mt-2 rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <Rows items={["10:00 Demo Aether", "12:30 Seguimiento Nova", "16:00 Kickoff Orbit"]} />
        </div>
      </div>
    ),
  },
  store: {
    path: "/saas/store",
    nav: ["Tienda", "Pedidos", "Productos"],
    active: 0,
    title: "Ecommerce",
    eyebrow: "Store",
    body: (
      <>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Kpi label="Pedidos" value="64" delta="30d" />
          <Kpi label="AOV" value="€86" delta="+4%" />
          <Kpi label="Pagados" value="51" delta="OK" />
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0b1428] p-3">
          <Rows items={["Pack Starter · stock 42", "Curso Growth · activo", "Pedido #8821 · paid"]} />
        </div>
      </>
    ),
  },
  lms: {
    path: "/saas/lms",
    nav: ["Cursos", "Alumnos", "Certificados"],
    active: 0,
    title: "LMS",
    eyebrow: "Cursos",
    body: (
      <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
        <Rows
          items={[
            "Fundamentos CRM · 128 alumnos",
            "Email avanzado · 64 alumnos",
            "Automatización · borrador",
          ]}
        />
        <Bars items={[{ label: "Compleción media", w: "61%" }, { label: "Certificados", w: "44%" }]} />
      </div>
    ),
  },
  funnels: {
    path: "/saas/funnels",
    nav: ["Funnels", "Landings", "Forms"],
    active: 0,
    title: "Embudos",
    eyebrow: "Captación",
    body: (
      <div className="flex flex-col gap-2 md:flex-row">
        {["Tráfico", "Lead", "SQL", "Cliente"].map((step, i) => (
          <div key={step} className="flex-1 rounded-xl border border-white/10 bg-[#0b1428] p-3 text-center">
            <p className="text-[10px] text-slate-500">Paso {i + 1}</p>
            <p className="mt-1 text-sm font-semibold text-white">{step}</p>
            <p className="mt-2 text-[10px] text-[#4da3ff]">{100 - i * 22}%</p>
          </div>
        ))}
      </div>
    ),
  },
  whatsapp: {
    path: "/saas/whatsapp",
    nav: ["WhatsApp", "Inbox", "Plantillas"],
    active: 0,
    title: "WhatsApp",
    eyebrow: "Mensajería",
    body: (
      <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
        <Rows
          items={[
            "Plantilla cita_confirmada · aprobada",
            "Conversación #2291 · abierta",
            "Twilio · configurado",
          ]}
        />
      </div>
    ),
  },
  portal: {
    path: "/portal",
    nav: ["Entregables", "Aprobar", "Historial"],
    active: 0,
    title: "Portal cliente",
    eyebrow: "Aprobación",
    body: (
      <div className="rounded-xl border border-white/10 bg-[#0b1428] p-3">
        <Rows
          items={[
            "Landing v3 · pendiente",
            "Pack SEO · aprobado",
            "Creatividades Meta · en revisión",
          ]}
        />
      </div>
    ),
  },
};

export function NelvyonProductMock({
  variant = "dashboard",
  className = "",
}: {
  variant?: ProductMockVariant;
  className?: string;
}) {
  const def = DEFS[variant] ?? DEFS.dashboard;

  return (
    <div className={`nv-public-product-frame ${className}`.trim()}>
      <div className="nv-public-product-chrome" aria-hidden>
        <span />
        <span />
        <span />
        <div className="ml-3 flex h-5 flex-1 items-center rounded-md bg-white/5 px-3 text-[10px] text-slate-500">
          app.nelvyon.com{def.path}
        </div>
      </div>
      <div className="grid min-h-[280px] grid-cols-[9.5rem_1fr] bg-[#020817] md:min-h-[360px]">
        <aside className="border-r border-white/10 bg-[#07122a] p-3 md:p-4" aria-hidden>
          <div className="mb-5 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#0084ff] text-[10px] font-bold text-white">
              N
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white">NELVYON</p>
              <p className="text-[9px] text-slate-500">SaaS · Growth</p>
            </div>
          </div>
          {def.nav.map((item, i) => (
            <div
              key={item}
              className={`mb-1 rounded-lg px-2.5 py-2 text-[11px] ${
                i === def.active ? "bg-[#0084ff]/15 font-semibold text-[#4da3ff]" : "text-slate-400"
              }`}
            >
              {item}
            </div>
          ))}
        </aside>
        <div className="p-3 md:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0084ff]">{def.eyebrow}</p>
              <p className="mt-1 text-sm font-semibold text-white md:text-base">{def.title}</p>
            </div>
            <div className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-400">
              Tenant demo · ES
            </div>
          </div>
          {def.body}
        </div>
      </div>
    </div>
  );
}
