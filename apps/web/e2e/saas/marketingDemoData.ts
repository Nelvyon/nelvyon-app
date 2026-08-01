/**
 * Demo-safe fixtures for marketing screenshots of the real SaaS UI.
 * All names/emails/companies are fictional. No secrets, tokens, or PII.
 */
import type { Page } from "@playwright/test";

import {
  FIXTURE_AFFILIATES,
  FIXTURE_API_KEYS,
  FIXTURE_AUDIT,
  FIXTURE_AUTOPILOT,
  FIXTURE_BRIEF_TO_LAUNCH,
  FIXTURE_COMPLIANCE,
  FIXTURE_DASHBOARD_LAYOUT,
  FIXTURE_ENTREGABLES_DATA,
  FIXTURE_FUNNELS,
  FIXTURE_LEAD_SCORING,
  FIXTURE_LOYALTY,
  FIXTURE_MEMBERSHIPS,
  FIXTURE_PLATFORM_HEALTH,
  FIXTURE_PUBLICIDAD,
  FIXTURE_SEQUENCES,
  FIXTURE_SSO,
  FIXTURE_WHATSAPP,
  FIXTURE_WHATSAPP_TEMPLATES,
  mockDataPlaybooks,
  mockEntregablesList,
  mockEntregablesRevenue,
  mockPackStore,
  mockPartnerZone,
  mockSaasPwa,
  mockSaasVoice,
  mockSectorBenchmark,
} from "./fixtures";

const NOW = "2026-07-15T10:00:00.000Z";
const DEMO_TENANT = "Nelvyon Demo · Aether Labs";

export const MARKETING_SETTINGS = {
  tenant: {
    companyName: DEMO_TENANT,
    industry: "saas",
    plan: "agency",
    website: "https://demo.nelvyon.example",
    phone: null,
    employees: "11-50",
  },
  role: "owner",
  permissions: [
    "contacts.read", "contacts.write", "contacts.delete",
    "deals.read", "deals.write", "deals.delete",
    "campanias.read", "campanias.write", "campanias.delete", "campanias.launch",
    "workflows.read", "workflows.write", "workflows.delete", "workflows.execute",
    "billing.read", "settings.read", "settings.write",
    "reports.generate", "analytics.read",
    "notifications.read", "notifications.write",
    "profile.read", "profile.write", "invoices.read",
    "sso.read", "sso.write", "audit.read",
    "affiliates.read", "affiliates.write", "loyalty.read", "loyalty.write",
  ],
};

export const MARKETING_DASHBOARD = {
  tenant: {
    id: "t-demo-aether",
    userId: "u-demo-owner",
    companyName: DEMO_TENANT,
    industry: "saas",
    plan: "agency",
    website: "https://demo.nelvyon.example",
    phone: null,
    employees: "11-50",
    goals: ["pipeline", "email", "workflows"],
    onboardingCompleted: true,
    onboardingStep: 4,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: NOW,
  },
  moduleStats: {
    contacts: 248,
    campaigns: 12,
    activeWorkflows: 9,
    forms: 6,
    upcomingAppointments: 14,
  },
  activeJobs: 3,
  completedJobs: 41,
  totalSpend: 0,
  recentActivity: [
    {
      id: "act-1",
      eventType: "contact.created",
      description: "Nuevo lead · Marina Solís (Nimbus Retail)",
      createdAt: "2026-07-15T09:40:00.000Z",
    },
    {
      id: "act-2",
      eventType: "campaign.sent",
      description: "Campaña enviada · Onboarding Q3",
      createdAt: "2026-07-15T08:15:00.000Z",
    },
    {
      id: "act-3",
      eventType: "workflow.run",
      description: "Workflow ejecutado · Lead scoring → CRM",
      createdAt: "2026-07-14T18:22:00.000Z",
    },
    {
      id: "act-4",
      eventType: "deal.updated",
      description: "Deal movido · Propuesta enviada",
      createdAt: "2026-07-14T16:05:00.000Z",
    },
  ],
};

export const MARKETING_CONTACTS = {
  contacts: [
    {
      id: "c-demo-01",
      name: "Marina Solís",
      email: "marina.solis@nimbus-retail.example",
      status: "lead",
      pipelineStage: "qualified",
      value: 18500,
      company: "Nimbus Retail",
      phone: "+34 600 100 201",
      position: "CMO",
      notes: "Interés en CRM + campañas",
      tags: ["saas", "demo"],
      createdAt: "2026-07-01T10:00:00.000Z",
    },
    {
      id: "c-demo-02",
      name: "Héctor Valdés",
      email: "h.valdes@nortek-clinic.example",
      status: "client",
      pipelineStage: "won",
      value: 42000,
      company: "Nortek Clinic",
      phone: "+34 600 100 202",
      position: "Director",
      notes: null,
      tags: ["health", "demo"],
      createdAt: "2026-05-12T10:00:00.000Z",
    },
    {
      id: "c-demo-03",
      name: "Lucía Ferrer",
      email: "lucia@orbital-law.example",
      status: "lead",
      pipelineStage: "proposal",
      value: 27600,
      company: "Orbital Law",
      phone: "+34 600 100 203",
      position: "Socio",
      notes: "Revisión de workflows",
      tags: ["legal", "demo"],
      createdAt: "2026-06-20T10:00:00.000Z",
    },
    {
      id: "c-demo-04",
      name: "Andrés Peña",
      email: "andres@lumen-homes.example",
      status: "prospect",
      pipelineStage: "new",
      value: 9800,
      company: "Lumen Homes",
      phone: "+34 600 100 204",
      position: "Marketing",
      notes: null,
      tags: ["real-estate", "demo"],
      createdAt: "2026-07-10T10:00:00.000Z",
    },
    {
      id: "c-demo-05",
      name: "Sofía Rivas",
      email: "sofia@cascade-shop.example",
      status: "lead",
      pipelineStage: "contacted",
      value: 33100,
      company: "Cascade Shop",
      phone: "+34 600 100 205",
      position: "Head of Growth",
      notes: "Ecommerce + LMS",
      tags: ["ecommerce", "demo"],
      createdAt: "2026-07-05T10:00:00.000Z",
    },
  ],
  total: 5,
  page: 1,
  pageSize: 50,
};

export const MARKETING_CRM_PIPELINE = {
  pipeline: [
    { stage: "new", count: 1, totalValue: 9800 },
    { stage: "contacted", count: 1, totalValue: 33100 },
    { stage: "qualified", count: 1, totalValue: 18500 },
    { stage: "proposal", count: 1, totalValue: 27600 },
    { stage: "won", count: 1, totalValue: 42000 },
    { stage: "lost", count: 0, totalValue: 0 },
  ],
};

export const MARKETING_DEALS = {
  deals: [
    {
      id: "d-demo-01",
      tenantId: "t-demo-aether",
      contactId: "c-demo-01",
      title: "Nimbus · CRM + Email",
      stage: "qualified",
      value: 18500,
      currency: "EUR",
      probability: 45,
      expectedCloseDate: "2026-08-20",
      source: "demo",
      ownerUserId: null,
      notes: "Demo tenant — caso de uso",
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "d-demo-02",
      tenantId: "t-demo-aether",
      contactId: "c-demo-03",
      title: "Orbital · Workflows legales",
      stage: "proposal",
      value: 27600,
      currency: "EUR",
      probability: 60,
      expectedCloseDate: "2026-08-05",
      source: "demo",
      ownerUserId: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "d-demo-03",
      tenantId: "t-demo-aether",
      contactId: "c-demo-05",
      title: "Cascade · Store + LMS",
      stage: "contacted",
      value: 33100,
      currency: "EUR",
      probability: 70,
      expectedCloseDate: "2026-07-30",
      source: "demo",
      ownerUserId: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "d-demo-04",
      tenantId: "t-demo-aether",
      contactId: "c-demo-04",
      title: "Lumen · Citas + WhatsApp",
      stage: "new",
      value: 9800,
      currency: "EUR",
      probability: 25,
      expectedCloseDate: "2026-09-01",
      source: "demo",
      ownerUserId: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: "d-demo-05",
      tenantId: "t-demo-aether",
      contactId: "c-demo-02",
      title: "Nortek · Expansión Agency",
      stage: "won",
      value: 42000,
      currency: "EUR",
      probability: 100,
      expectedCloseDate: "2026-06-12",
      source: "demo",
      ownerUserId: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  total: 5,
};

export const MARKETING_FORECAST = {
  forecast: {
    weightedTotal: 41255,
    bestCase: 89000,
    committed: 33100,
    byStage: [
      { stage: "new", count: 1, value: 9800, weightedValue: 2450, probability: 25 },
      { stage: "contacted", count: 1, value: 33100, weightedValue: 23170, probability: 70 },
      { stage: "qualified", count: 1, value: 18500, weightedValue: 8325, probability: 45 },
      { stage: "proposal", count: 1, value: 27600, weightedValue: 16560, probability: 60 },
    ],
  },
};

export const MARKETING_CAMPANIAS = {
  campanias: [
    {
      id: "camp-demo-01",
      name: "Onboarding Q3",
      description: "Secuencia de bienvenida demo",
      status: "completed",
      channel: "email",
      subject: "Bienvenida al workspace NELVYON",
      body: "<p>Hola — bienvenido al workspace demo.</p>",
      ctaText: "Abrir panel",
      ctaUrl: "https://demo.nelvyon.example",
      audienceFilter: {},
      scheduledAt: null,
      totalRecipients: 420,
      sentCount: 418,
      openedCount: 187,
      clickedCount: 64,
    },
    {
      id: "camp-demo-02",
      name: "Nurturing pipeline",
      description: "Nurture de oportunidades abiertas",
      status: "running",
      channel: "email",
      subject: "Siguiente paso en tu evaluación",
      body: "<p>Retomamos la conversación.</p>",
      ctaText: "Agendar demo",
      ctaUrl: "https://demo.nelvyon.example/demo",
      audienceFilter: {},
      scheduledAt: null,
      totalRecipients: 156,
      sentCount: 90,
      openedCount: 41,
      clickedCount: 12,
    },
    {
      id: "camp-demo-03",
      name: "Reactivación julio",
      description: "Borrador programado",
      status: "draft",
      channel: "email",
      subject: "Retomemos la conversación",
      body: "<p>Borrador demo.</p>",
      ctaText: null,
      ctaUrl: null,
      audienceFilter: {},
      scheduledAt: "2026-07-22T09:00:00.000Z",
      totalRecipients: 0,
      sentCount: 0,
      openedCount: 0,
      clickedCount: 0,
    },
  ],
  total: 3,
  ses_configured: true,
  twilio_configured: false,
};

export const MARKETING_WORKFLOWS = {
  workflows: [
    {
      id: "wf-demo-01",
      name: "Lead scoring → CRM",
      description: "Cuando el score supera el umbral, notifica y etiqueta el contacto.",
      status: "active",
      triggerType: "score_threshold",
      triggerConfig: { min_score: 50 },
      conditions: [],
      actions: [
        { type: "add_tag", config: { tag: "hot-lead" } },
        { type: "notify", config: { message: "Lead caliente listo para seguimiento" } },
      ],
      runCount: 128,
      lastRunAt: "2026-07-15T09:10:00.000Z",
      createdAt: "2026-03-01T10:00:00.000Z",
    },
    {
      id: "wf-demo-02",
      name: "Deal ganado → onboarding",
      description: "Al ganar un deal, crea tarea de onboarding.",
      status: "active",
      triggerType: "deal_stage_changed",
      triggerConfig: { stage_to: "won" },
      conditions: [],
      actions: [
        { type: "create_task", config: { title: "Kickoff onboarding", description: "Caso de uso demo", dueInDays: 2 } },
        { type: "send_email", config: { to: "{{contact.email}}", subject: "Bienvenida", body: "..." } },
      ],
      runCount: 34,
      lastRunAt: "2026-07-14T17:00:00.000Z",
      createdAt: "2026-04-12T10:00:00.000Z",
    },
    {
      id: "wf-demo-03",
      name: "Formulario web → secuencia",
      description: "Inscribe leads de formulario en secuencia email.",
      status: "active",
      triggerType: "form_submitted",
      triggerConfig: {},
      conditions: [],
      actions: [{ type: "enroll_sequence", config: { sequenceId: "seq-demo-1" } }],
      runCount: 76,
      lastRunAt: "2026-07-15T08:00:00.000Z",
      createdAt: "2026-05-02T10:00:00.000Z",
    },
    {
      id: "wf-demo-04",
      name: "Tag VIP → WhatsApp",
      description: "Pausado — requiere Twilio en el entorno.",
      status: "paused",
      triggerType: "tag_added",
      triggerConfig: { tag: "vip" },
      conditions: [],
      actions: [{ type: "send_whatsapp", config: { to: "{{contact.phone}}", body: "Hola {{contact.name}}" } }],
      runCount: 19,
      lastRunAt: "2026-07-01T11:00:00.000Z",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
  ],
  total: 4,
  ses_configured: true,
  twilio_configured: false,
};

export const MARKETING_BILLING = {
  tenant: {
    companyName: DEMO_TENANT,
    plan: "agency",
    billingStatus: "active" as const,
  },
  role: "owner",
  limits: {
    contacts: 5000,
    deals: 2000,
    campanias: 100,
    workflows: 50,
    users: 25,
  },
  usage: {
    contacts: 248,
    deals: 5,
    campanias: 12,
    workflows: 9,
    users: 3,
  },
  stripeConfigured: true,
  billingNote: null,
};

export const MARKETING_INVOICES = {
  invoices: [
    {
      id: "inv-demo-01",
      invoiceNumber: "NV-DEMO-0042",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-08-01T00:00:00.000Z",
      amountEur: 797,
      status: "paid" as const,
      createdAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "inv-demo-02",
      invoiceNumber: "NV-DEMO-0041",
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-07-01T00:00:00.000Z",
      amountEur: 797,
      status: "paid" as const,
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ],
};

export const MARKETING_REPORTES_SUMMARY = {
  summary: {
    totalVisits: 12840,
    totalFormSubmits: 412,
    totalConversions: 96,
    totalContacts: 248,
    topSource: "email",
  },
};

export const MARKETING_REPORTES_CHANNELS = {
  channels: [
    { utmSource: "email", utmMedium: "newsletter", visits: 4200, formSubmits: 180, conversions: 38, contacts: 92 },
    { utmSource: "whatsapp", utmMedium: "chat", visits: 2100, formSubmits: 96, conversions: 22, contacts: 54 },
    { utmSource: "google", utmMedium: "cpc", visits: 3800, formSubmits: 88, conversions: 19, contacts: 61 },
    { utmSource: "organic", utmMedium: "seo", visits: 2740, formSubmits: 48, conversions: 17, contacts: 41 },
  ],
};

export const MARKETING_REPORTES_CAMPAIGNS = {
  campaigns: [
    { utmCampaign: "onboarding-q3", utmSource: "email", visits: 1800, formSubmits: 74, conversions: 18, contacts: 40 },
    { utmCampaign: "nurture-pipeline", utmSource: "email", visits: 1200, formSubmits: 52, conversions: 11, contacts: 28 },
  ],
};

export const MARKETING_REPORTS_LIST = {
  reports: [
    {
      id: "rep-1",
      name: "Resumen ejecutivo julio",
      type: "executive_summary",
      status: "ready",
      createdAt: "2026-07-28T10:00:00.000Z",
      downloadUrl: null,
      sizeBytes: 245760,
    },
    {
      id: "rep-2",
      name: "Email marketing Q3",
      type: "email_marketing",
      status: "ready",
      createdAt: "2026-07-20T10:00:00.000Z",
      downloadUrl: null,
      sizeBytes: 189440,
    },
  ],
};

export const MARKETING_INBOX = {
  conversations: [
    {
      id: "in-demo-01",
      channel: "email",
      subject: "Re: demo CRM",
      contactName: "Marina Solís",
      contactEmail: "marina.solis@nimbus-retail.example",
      preview: "¿Podemos revisar el pipeline juntos el jueves?",
      status: "open",
      updatedAt: "2026-07-15T09:50:00.000Z",
    },
    {
      id: "in-demo-02",
      channel: "whatsapp",
      subject: "Confirmación cita",
      contactName: "Lucía Ferrer",
      contactEmail: "lucia@orbital-law.example",
      preview: "Confirmado para las 11:30",
      status: "open",
      updatedAt: "2026-07-15T08:20:00.000Z",
    },
    {
      id: "in-demo-03",
      channel: "email",
      subject: "Facturación Agency",
      contactName: "Sofía Rivas",
      contactEmail: "sofia@cascade-shop.example",
      preview: "Recibido el resumen del periodo",
      status: "closed",
      updatedAt: "2026-07-13T15:00:00.000Z",
    },
  ],
  total: 3,
};

export const MARKETING_INTEGRATIONS = {
  catalog: [
    { id: "stripe", slug: "stripe", displayName: "Stripe", icon: "💳", category: "payments", connectionType: "env", status: "live", envConfigured: true },
    { id: "ses", slug: "ses", displayName: "Amazon SES", icon: "✉️", category: "email", connectionType: "env", status: "live", envConfigured: true },
    { id: "meta", slug: "meta", displayName: "Meta Ads", icon: "📘", category: "ads", connectionType: "oauth", status: "live", envConfigured: false },
    { id: "google", slug: "google", displayName: "Google Ads", icon: "🔍", category: "ads", connectionType: "oauth", status: "live", envConfigured: false },
    { id: "shopify", slug: "shopify", displayName: "Shopify", icon: "🛒", category: "commerce", connectionType: "manual", status: "live", envConfigured: false },
    { id: "twilio", slug: "twilio", displayName: "Twilio / WhatsApp", icon: "💬", category: "comms", connectionType: "env", status: "live", envConfigured: true },
  ],
  connections: [
    {
      slug: "stripe",
      catalogStatus: "live",
      displayName: "Stripe",
      icon: "💳",
      category: "payments",
      connectionType: "env",
      envKeys: [],
      status: "connected",
      envConfigured: true,
      connectedAccount: "Aether Labs Demo",
      lastSyncAt: NOW,
      errorMessage: null,
    },
    {
      slug: "ses",
      catalogStatus: "live",
      displayName: "Amazon SES",
      icon: "✉️",
      category: "email",
      connectionType: "env",
      envKeys: [],
      status: "connected",
      envConfigured: true,
      connectedAccount: "eu-west-1 · demo",
      lastSyncAt: NOW,
      errorMessage: null,
    },
    {
      slug: "twilio",
      catalogStatus: "live",
      displayName: "Twilio / WhatsApp",
      icon: "💬",
      category: "comms",
      connectionType: "env",
      envKeys: [],
      status: "connected",
      envConfigured: true,
      connectedAccount: "sandbox demo",
      lastSyncAt: NOW,
      errorMessage: null,
    },
  ],
  summary: { total: 6, connected: 3, envOnly: 3, oauthReady: 0 },
};

export const MARKETING_APPOINTMENTS = {
  appointments: [
    {
      id: "apt-1",
      title: "Demo CRM · Nimbus",
      contactName: "Marina Solís",
      startsAt: "2026-07-16T10:00:00.000Z",
      endsAt: "2026-07-16T10:45:00.000Z",
      status: "confirmed",
      channel: "meet",
    },
    {
      id: "apt-2",
      title: "Revisión workflows · Orbital",
      contactName: "Lucía Ferrer",
      startsAt: "2026-07-16T11:30:00.000Z",
      endsAt: "2026-07-16T12:15:00.000Z",
      status: "confirmed",
      channel: "meet",
    },
    {
      id: "apt-3",
      title: "Kickoff Store · Cascade",
      contactName: "Sofía Rivas",
      startsAt: "2026-07-17T09:00:00.000Z",
      endsAt: "2026-07-17T10:00:00.000Z",
      status: "pending",
      channel: "meet",
    },
  ],
  total: 3,
};

export const MARKETING_STORE = {
  products: [
    { id: "p1", name: "Plan Starter (demo)", price: 49, currency: "EUR", status: "active", stock: 999 },
    { id: "p2", name: "Plan Pro (demo)", price: 149, currency: "EUR", status: "active", stock: 999 },
    { id: "p3", name: "Add-on LMS (demo)", price: 39, currency: "EUR", status: "active", stock: 999 },
  ],
  orders: [
    { id: "o1", customer: "Nortek Clinic", total: 149, status: "paid", createdAt: "2026-07-12T12:00:00.000Z" },
    { id: "o2", customer: "Cascade Shop", total: 188, status: "paid", createdAt: "2026-07-14T09:00:00.000Z" },
  ],
  summary: { products: 3, orders: 2 },
};

export const MARKETING_LMS = {
  courses: [
    {
      id: "course-1",
      title: "Onboarding comercial NELVYON",
      status: "published",
      lessons: 8,
      enrollments: 42,
      updatedAt: NOW,
    },
    {
      id: "course-2",
      title: "Workflows para equipos de ventas",
      status: "published",
      lessons: 6,
      enrollments: 28,
      updatedAt: NOW,
    },
    {
      id: "course-3",
      title: "Campañas email con SES",
      status: "draft",
      lessons: 5,
      enrollments: 0,
      updatedAt: NOW,
    },
  ],
  summary: { courses: 3, enrollments: 70 },
};

export const MARKETING_AGENTES = {
  agents: [
    {
      id: "ag-1",
      name: "Agente copy de campañas",
      status: "ready",
      role: "copywriter",
      lastRunAt: "2026-07-15T07:00:00.000Z",
    },
    {
      id: "ag-2",
      name: "Agente resumen de pipeline",
      status: "ready",
      role: "analyst",
      lastRunAt: "2026-07-14T19:00:00.000Z",
    },
    {
      id: "ag-3",
      name: "Agente FAQ portal",
      status: "draft",
      role: "support",
      lastRunAt: null,
    },
  ],
  summary: { total: 3, ready: 2 },
};

export const MARKETING_AI = {
  conversations: [
    {
      id: "ai-1",
      title: "Brief campaña Onboarding Q3",
      updatedAt: "2026-07-15T08:40:00.000Z",
      preview: "Borrador de subject + cuerpo listo para revisión humana",
    },
    {
      id: "ai-2",
      title: "Resumen deals abiertos",
      updatedAt: "2026-07-14T18:10:00.000Z",
      preview: "3 deals en negociación · 1 propuesta pendiente",
    },
  ],
  canary: { enabled: false, killSwitch: true },
  models: [{ id: "local-demo", label: "Modo asistido (demo)", status: "available" }],
};

export const MARKETING_TEAM = {
  members: [
    { id: "m1", name: "Owner Demo", email: "owner@aether-labs.example", role: "owner", status: "active" },
    { id: "m2", name: "Ops Demo", email: "ops@aether-labs.example", role: "admin", status: "active" },
    { id: "m3", name: "Sales Demo", email: "sales@aether-labs.example", role: "member", status: "active" },
  ],
  total: 3,
};

/** Intercept SaaS APIs with marketing-rich demo payloads (real UI, safe data). */
export async function mockMarketingSaasApis(page: Page): Promise<void> {
  await page.route("**/api/saas/**", (route) => route.fulfill({ json: { ok: true }, status: 200 }));

  await page.route("**/api/saas/settings**", (route) => route.fulfill({ json: MARKETING_SETTINGS }));
  await page.route("**/api/saas/platform-health**", (route) =>
    route.fulfill({ json: FIXTURE_PLATFORM_HEALTH }),
  );
  await page.route("**/api/saas/crm/contacts**", (route) => route.fulfill({ json: MARKETING_CONTACTS }));
  await page.route("**/api/saas/crm/pipeline**", (route) => route.fulfill({ json: MARKETING_CRM_PIPELINE }));
  await page.route("**/api/saas/deals**", (route) => route.fulfill({ json: MARKETING_DEALS }));
  await page.route("**/api/saas/pipeline**", (route) => route.fulfill({ json: MARKETING_DEALS }));
  await page.route("**/api/saas/playbooks**", (route) => {
    const url = route.request().url();
    if (url.includes("resource=forecast")) {
      return route.fulfill({ json: MARKETING_FORECAST });
    }
    return route.fulfill({ json: { playbooks: [] } });
  });
  await page.route("**/api/saas/campanias**", (route) => route.fulfill({ json: MARKETING_CAMPANIAS }));
  await page.route("**/api/saas/workflows**", (route) => route.fulfill({ json: MARKETING_WORKFLOWS }));
  await page.route("**/api/saas/sequences**", (route) => route.fulfill({ json: FIXTURE_SEQUENCES }));
  await page.route("**/api/saas/billing**", (route) => route.fulfill({ json: MARKETING_BILLING }));
  await page.route("**/api/saas/invoices**", (route) => route.fulfill({ json: MARKETING_INVOICES }));
  await page.route("**/api/saas/audit**", (route) => route.fulfill({ json: FIXTURE_AUDIT }));
  await page.route("**/api/saas/affiliates**", (route) => route.fulfill({ json: FIXTURE_AFFILIATES }));
  await page.route("**/api/saas/loyalty**", (route) => route.fulfill({ json: FIXTURE_LOYALTY }));
  await page.route("**/api/saas/api-keys**", (route) => route.fulfill({ json: FIXTURE_API_KEYS }));
  await page.route("**/api/saas/lead-scoring**", (route) => route.fulfill({ json: FIXTURE_LEAD_SCORING }));
  await page.route("**/api/saas/reportes**", (route) => {
    const url = route.request().url();
    if (url.includes("resource=channels")) return route.fulfill({ json: MARKETING_REPORTES_CHANNELS });
    if (url.includes("resource=campaigns")) return route.fulfill({ json: MARKETING_REPORTES_CAMPAIGNS });
    if (url.includes("resource=models")) {
      return route.fulfill({
        json: {
          breakdown: {
            channels: [
              { utmSource: "email", credit: 0.42, conversions: 38 },
              { utmSource: "google", credit: 0.28, conversions: 19 },
              { utmSource: "whatsapp", credit: 0.18, conversions: 22 },
              { utmSource: "organic", credit: 0.12, conversions: 17 },
            ],
          },
        },
      });
    }
    return route.fulfill({ json: MARKETING_REPORTES_SUMMARY });
  });
  await page.route("**/api/saas/reports**", (route) => route.fulfill({ json: MARKETING_REPORTS_LIST }));
  await page.route("**/api/saas/utm**", (route) =>
    route.fulfill({
      json: {
        links: [
          {
            id: "utm-1",
            name: "Onboarding Q3",
            utmSource: "email",
            utmMedium: "newsletter",
            utmCampaign: "onboarding-q3",
            clicks: 420,
            fullUrl: "https://demo.nelvyon.example/?utm_campaign=onboarding-q3",
            createdAt: NOW,
          },
        ],
      },
    }),
  );
  await page.route("**/api/saas/ads/alerts**", (route) => route.fulfill({ json: { alerts: [] } }));
  await page.route("**/api/saas/sso**", (route) => route.fulfill({ json: FIXTURE_SSO }));
  await page.route("**/api/saas/funnels**", (route) => route.fulfill({ json: FIXTURE_FUNNELS }));
  await page.route("**/api/saas/inbox**", (route) => route.fulfill({ json: MARKETING_INBOX }));
  await page.route("**/api/saas/brief-to-launch**", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        json: { launch: { id: "launch-demo", status: "queued", packId: "local-business-growth" } },
      });
    }
    return route.fulfill({ json: FIXTURE_BRIEF_TO_LAUNCH });
  });
  await page.route("**/api/saas/compliance**", (route) => route.fulfill({ json: FIXTURE_COMPLIANCE }));
  await page.route("**/api/saas/autopilot**", (route) => route.fulfill({ json: FIXTURE_AUTOPILOT }));
  await mockEntregablesRevenue(page);
  await mockEntregablesList(page, FIXTURE_ENTREGABLES_DATA);
  await page.route("**/api/saas/publicidad**", (route) => route.fulfill({ json: FIXTURE_PUBLICIDAD }));
  await page.route("**/api/saas/integrations**", (route) =>
    route.fulfill({ json: MARKETING_INTEGRATIONS }),
  );
  await page.route("**/api/saas/memberships**", (route) => route.fulfill({ json: FIXTURE_MEMBERSHIPS }));
  await page.route("**/api/saas/whatsapp**", (route) => route.fulfill({ json: FIXTURE_WHATSAPP }));
  await page.route("**/api/saas/whatsapp/templates**", (route) =>
    route.fulfill({ json: FIXTURE_WHATSAPP_TEMPLATES }),
  );
  await page.route("**/api/saas/citas**", (route) => route.fulfill({ json: MARKETING_APPOINTMENTS }));
  await page.route("**/api/saas/appointments**", (route) =>
    route.fulfill({ json: MARKETING_APPOINTMENTS }),
  );
  await page.route("**/api/saas/calendar**", (route) => route.fulfill({ json: MARKETING_APPOINTMENTS }));
  await page.route("**/api/saas/store**", (route) => route.fulfill({ json: MARKETING_STORE }));
  await page.route("**/api/saas/lms**", (route) => route.fulfill({ json: MARKETING_LMS }));
  await page.route("**/api/saas/agentes**", (route) => route.fulfill({ json: MARKETING_AGENTES }));
  await page.route("**/api/saas/ai**", (route) => route.fulfill({ json: MARKETING_AI }));
  await page.route("**/api/saas/chat**", (route) => route.fulfill({ json: MARKETING_AI }));
  await page.route("**/api/saas/team**", (route) => route.fulfill({ json: MARKETING_TEAM }));
  await page.route("**/api/saas/dashboard/layout**", (route) =>
    route.fulfill({ json: FIXTURE_DASHBOARD_LAYOUT }),
  );
  await page.route("**/api/saas/dashboard**", (route) => {
    const url = route.request().url();
    if (url.includes("/layout") || url.includes("/activity")) return route.fallback();
    return route.fulfill({ json: MARKETING_DASHBOARD });
  });

  await mockSaasVoice(page);
  await mockSectorBenchmark(page);
  await mockDataPlaybooks(page);
  await mockPackStore(page);
  await mockPartnerZone(page);
  await mockSaasPwa(page);

  // Specific routes last (Playwright LIFO).
  await page.route("**/api/saas/funnels**", (route) => route.fulfill({ json: FIXTURE_FUNNELS }));
  await page.route("**/api/saas/crm/pipeline**", (route) => route.fulfill({ json: MARKETING_CRM_PIPELINE }));
  await page.route("**/api/saas/crm/contacts**", (route) => route.fulfill({ json: MARKETING_CONTACTS }));
  await page.route("**/api/saas/deals**", (route) => route.fulfill({ json: MARKETING_DEALS }));
  await page.route("**/api/saas/playbooks**", (route) => {
    const url = route.request().url();
    if (url.includes("resource=forecast")) {
      return route.fulfill({ json: MARKETING_FORECAST });
    }
    return route.fulfill({ json: { playbooks: [] } });
  });
  await page.route("**/api/saas/campanias**", (route) => route.fulfill({ json: MARKETING_CAMPANIAS }));
  await page.route("**/api/saas/workflows**", (route) => route.fulfill({ json: MARKETING_WORKFLOWS }));
  await page.route("**/api/saas/billing**", (route) => route.fulfill({ json: MARKETING_BILLING }));
  await page.route("**/api/saas/invoices**", (route) => route.fulfill({ json: MARKETING_INVOICES }));
  await page.route("**/api/saas/reportes**", (route) => {
    const url = route.request().url();
    if (url.includes("resource=channels")) return route.fulfill({ json: MARKETING_REPORTES_CHANNELS });
    if (url.includes("resource=campaigns")) return route.fulfill({ json: MARKETING_REPORTES_CAMPAIGNS });
    if (url.includes("resource=models")) {
      return route.fulfill({
        json: {
          breakdown: {
            channels: [
              { utmSource: "email", credit: 0.42, conversions: 38 },
              { utmSource: "google", credit: 0.28, conversions: 19 },
            ],
          },
        },
      });
    }
    return route.fulfill({ json: MARKETING_REPORTES_SUMMARY });
  });
  await page.route("**/api/saas/reports**", (route) => route.fulfill({ json: MARKETING_REPORTS_LIST }));
  await page.route("**/api/saas/inbox**", (route) => route.fulfill({ json: MARKETING_INBOX }));
  await page.route("**/api/saas/integrations**", (route) =>
    route.fulfill({ json: MARKETING_INTEGRATIONS }),
  );
}
