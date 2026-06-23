import { getBreadcrumbs } from "@/core/shell/breadcrumbTypes";
import { getRoutePageMeta } from "@/core/shell/routePageRegistry";

describe("getRoutePageMeta", () => {
  it("titles CRM client detail with id", () => {
    const meta = getRoutePageMeta("/crm/clients/42");
    expect(meta.heading).toBe("Cliente #42");
    expect(meta.documentTitle).toContain("NELVYON");
  });
  it("titles Revenue deals list", () => {
    const meta = getRoutePageMeta("/crm/deals");
    expect(meta.heading).toBe("Pipeline comercial");
    expect(meta.documentTitle).toContain("Revenue");
  });

  it("titles billing overview", () => {
    const meta = getRoutePageMeta("/billing");
    expect(meta.heading).toBe("Billing");
    expect(meta.documentTitle).toContain("Billing");
  });

  it("titles help center", () => {
    const meta = getRoutePageMeta("/help");
    expect(meta.heading).toBe("Help center");
    expect(meta.documentTitle).toContain("Help center");
  });

  it("titles settings audit page", () => {
    const meta = getRoutePageMeta("/settings/audit");
    expect(meta.heading).toBe("Audit & security");
    expect(meta.documentTitle).toContain("Audit & security");
  });

  it("titles client signup v1", () => {
    const meta = getRoutePageMeta("/auth/signup");
    expect(meta.heading).toBe("Client signup v1");
    expect(meta.documentTitle).toContain("signup");
  });
  it("titles professional assistant v1", () => {
    const meta = getRoutePageMeta("/app/assistant");
    expect(meta.heading).toBe("Professional assistant v1");
    expect(meta.documentTitle).toContain("assistant");
  });

  it("titles business advisor v1", () => {
    const meta = getRoutePageMeta("/app/advisor");
    expect(meta.heading).toBe("Business advisor");
    expect(meta.documentTitle).toContain("advisor");
  });

  it("titles channels and communications v1", () => {
    const meta = getRoutePageMeta("/app/communications");
    expect(meta.heading).toBe("Channels and communications");
    expect(meta.documentTitle).toContain("communications");
  });

  it("titles workspace branding v1", () => {
    const meta = getRoutePageMeta("/app/branding");
    expect(meta.heading).toBe("Workspace branding");
    expect(meta.documentTitle).toContain("branding");
  });
  it("titles tenant branding policy v2", () => {
    const meta = getRoutePageMeta("/app/branding/policy");
    expect(meta.heading).toBe("Tenant branding policy");
  });
  it("titles tenant preview matrix v2", () => {
    const meta = getRoutePageMeta("/app/branding/preview-v2");
    expect(meta.heading).toBe("Tenant preview matrix");
  });

  it("titles voice voz v1", () => {
    const meta = getRoutePageMeta("/app/voz");
    expect(meta.heading).toBe("Voice (VOZ)");
    expect(meta.documentTitle.toLowerCase()).toContain("voice");
  });

  it("titles voice v2 inbound", () => {
    const meta = getRoutePageMeta("/app/voz/inbound");
    expect(meta.heading).toBe("Inbound voice note");
    expect(meta.documentTitle.toLowerCase()).toContain("inbound");
  });

  it("titles voice v2 synth", () => {
    const meta = getRoutePageMeta("/app/voz/outbound-synth");
    expect(meta.heading).toBe("Browser synth (listen)");
  });

  it("titles os observability snapshot", () => {
    const meta = getRoutePageMeta("/os/observability");
    expect(meta.heading).toBe("Health & SLO snapshot");
  });
  it("titles os tenant activation guard", () => {
    const meta = getRoutePageMeta("/os/tenants/activation");
    expect(meta.heading).toBe("Tenant activation guard");
  });
  it("titles os global snapshot", () => {
    const meta = getRoutePageMeta("/os/global");
    expect(meta.heading).toBe("Cross-workspace operations snapshot");
  });
  it("titles os qa checklist", () => {
    const meta = getRoutePageMeta("/os/qa/checklist");
    expect(meta.heading).toBe("QA core checklist");
  });
  it("titles os design system v1", () => {
    const meta = getRoutePageMeta("/os/design-system");
    expect(meta.heading).toBe("Design System v1");
  });
  it("titles os web premium preview", () => {
    const meta = getRoutePageMeta("/os/web-premium/preview");
    expect(meta.heading).toBe("Web Premium template preview");
  });
  it("titles os ecommerce premium catalog", () => {
    const meta = getRoutePageMeta("/os/ecommerce-premium/preview");
    expect(meta.heading).toBe("E‑commerce Premium catalog");
  });
  it("titles os ecommerce premium PDP", () => {
    const meta = getRoutePageMeta("/os/ecommerce-premium/preview/p/wireless-kit");
    expect(meta.heading).toBe("Product detail");
    expect(meta.documentTitle).toContain("wireless-kit");
  });
  it("titles os seo premium preview", () => {
    const meta = getRoutePageMeta("/os/seo-premium/preview");
    expect(meta.heading).toBe("SEO Premium audit");
  });
  it("titles os ads premium preview", () => {
    const meta = getRoutePageMeta("/os/ads-premium/preview");
    expect(meta.heading).toBe("Ads Premium campaign");
  });
  it("titles os branding premium preview", () => {
    const meta = getRoutePageMeta("/os/branding-premium/preview");
    expect(meta.heading).toBe("Branding Premium project");
  });
  it("titles os voz premium preview", () => {
    const meta = getRoutePageMeta("/os/voz-premium/preview");
    expect(meta.heading).toBe("Voz Premium delivery");
  });
  it("titles os bots premium preview", () => {
    const meta = getRoutePageMeta("/os/bots-premium/preview");
    expect(meta.heading).toBe("Bots Premium delivery");
  });
  it("titles os personal digital premium preview", () => {
    const meta = getRoutePageMeta("/os/personal-digital-premium/preview");
    expect(meta.heading).toBe("Personal Digital Premium delivery");
  });
  it("titles os advisor empresarial premium preview", () => {
    const meta = getRoutePageMeta("/os/advisor-empresarial-premium/preview");
    expect(meta.heading).toBe("Advisor Empresarial Premium delivery");
  });
  it("titles os canales comunicaciones premium preview", () => {
    const meta = getRoutePageMeta("/os/canales-comunicaciones-premium/preview");
    expect(meta.heading).toBe("Canales y Comunicaciones Premium delivery");
  });
  it("titles os social media premium preview", () => {
    const meta = getRoutePageMeta("/os/social-media-premium/preview");
    expect(meta.heading).toBe("Social Media Premium delivery");
  });
  it("titles os email marketing premium preview", () => {
    const meta = getRoutePageMeta("/os/email-marketing-premium/preview");
    expect(meta.heading).toBe("Email Marketing Premium delivery");
  });
  it("titles os contenido copywriting premium preview", () => {
    const meta = getRoutePageMeta("/os/contenido-copywriting-premium/preview");
    expect(meta.heading).toBe("Contenido y Copywriting Premium delivery");
  });
  it("titles os video multimedia premium preview", () => {
    const meta = getRoutePageMeta("/os/video-multimedia-premium/preview");
    expect(meta.heading).toBe("Video y Multimedia Premium delivery");
  });
  it("titles os 3d inmersivo premium preview", () => {
    const meta = getRoutePageMeta("/os/3d-inmersivo-premium/preview");
    expect(meta.heading).toBe("3D y Contenido Inmersivo Premium delivery");
  });
  it("titles os fotografia producto premium preview", () => {
    const meta = getRoutePageMeta("/os/fotografia-producto-premium/preview");
    expect(meta.heading).toBe("Fotografía de Producto Premium delivery");
  });
  it("titles os diseno grafico premium preview", () => {
    const meta = getRoutePageMeta("/os/diseno-grafico-premium/preview");
    expect(meta.heading).toBe("Diseño gráfico y creatividades Premium delivery");
  });
  it("titles os consultoria automatizacion premium preview", () => {
    const meta = getRoutePageMeta("/os/consultoria-automatizacion-premium/preview");
    expect(meta.heading).toBe("Consultoría de automatización Premium delivery");
  });
  it("titles os integraciones apis premium preview", () => {
    const meta = getRoutePageMeta("/os/integraciones-apis-premium/preview");
    expect(meta.heading).toBe("Integraciones y APIs Premium delivery");
  });
  it("titles os mantenimiento web premium preview", () => {
    const meta = getRoutePageMeta("/os/mantenimiento-web-premium/preview");
    expect(meta.heading).toBe("Mantenimiento web Premium delivery");
  });
  it("titles os reputacion orm premium preview", () => {
    const meta = getRoutePageMeta("/os/reputacion-orm-premium/preview");
    expect(meta.heading).toBe("Reputación online y ORM Premium delivery");
  });
  it("titles os formacion capacitacion premium preview", () => {
    const meta = getRoutePageMeta("/os/formacion-capacitacion-premium/preview");
    expect(meta.heading).toBe("Formación y capacitación digital Premium delivery");
  });
  it("titles os influencer marketing premium preview", () => {
    const meta = getRoutePageMeta("/os/influencer-marketing-premium/preview");
    expect(meta.heading).toBe("Influencer Marketing Premium delivery");
  });
});

describe("getBreadcrumbs", () => {
  it("builds Revenue client detail trail", () => {
    const crumbs = getBreadcrumbs("/crm/clients/7");
    expect(crumbs[0]?.label).toBe("Revenue");
    expect(crumbs[crumbs.length - 1]?.label).toBe("Cliente #7");
  });
  it("builds Revenue deal detail trail", () => {
    const crumbs = getBreadcrumbs("/crm/deals/9");
    expect(crumbs[0]?.label).toBe("Revenue");
    expect(crumbs.some((c) => c.label === "Pipeline comercial")).toBe(true);
    expect(crumbs[crumbs.length - 1]?.label).toBe("Deal #9");
  });

  it("builds automations jobs trail", () => {
    const crumbs = getBreadcrumbs("/automations/jobs/3");
    expect(crumbs[0]?.label).toBe("Automations");
    expect(crumbs.some((c) => c.label === "Job #3")).toBe(true);
  });

  it("builds settings audit trail", () => {
    const crumbs = getBreadcrumbs("/settings/audit");
    expect(crumbs[0]?.label).toBe("Settings");
    expect(crumbs.some((c) => c.label === "Audit & security")).toBe(true);
  });

  it("builds app support trail", () => {
    const crumbs = getBreadcrumbs("/app/support");
    expect(crumbs[0]?.label).toBe("Support");
  });
  it("builds app assistant trail", () => {
    const crumbs = getBreadcrumbs("/app/assistant");
    expect(crumbs[0]?.label).toBe("Assistant");
  });
  it("builds app advisor trail", () => {
    const crumbs = getBreadcrumbs("/app/advisor");
    expect(crumbs[crumbs.length - 1]?.label).toBe("Advisor");
  });
  it("builds app communications trail", () => {
    const crumbs = getBreadcrumbs("/app/communications");
    expect(crumbs[crumbs.length - 1]?.label).toBe("Communications");
  });
  it("builds app branding trail", () => {
    const crumbs = getBreadcrumbs("/app/branding");
    expect(crumbs[crumbs.length - 1]?.label).toBe("Branding");
  });
  it("builds app branding policy trail", () => {
    const crumbs = getBreadcrumbs("/app/branding/policy");
    expect(crumbs.some((c) => c.label === "Policy")).toBe(true);
  });
  it("builds app voz trail", () => {
    const crumbs = getBreadcrumbs("/app/voz");
    expect(crumbs[crumbs.length - 1]?.label).toBe("Voz");
  });
  it("builds app voz inbound trail", () => {
    const crumbs = getBreadcrumbs("/app/voz/inbound");
    expect(crumbs.some((c) => c.label === "Inbound")).toBe(true);
  });
  it("builds os observability incidents trail", () => {
    const crumbs = getBreadcrumbs("/os/observability/incidents");
    expect(crumbs.some((c) => c.label === "Observability")).toBe(true);
    expect(crumbs.some((c) => c.label === "Incidents")).toBe(true);
  });
  it("builds os tenant activation trail", () => {
    const crumbs = getBreadcrumbs("/os/tenants/activation");
    expect(crumbs.some((c) => c.label === "Tenant activation")).toBe(true);
  });
  it("builds os global risk queue trail", () => {
    const crumbs = getBreadcrumbs("/os/global/risk-queue");
    expect(crumbs.some((c) => c.label === "Global")).toBe(true);
    expect(crumbs.some((c) => c.label === "Risk queue")).toBe(true);
  });
  it("builds os excellence golden path trail", () => {
    const crumbs = getBreadcrumbs("/os/excellence/golden-path");
    expect(crumbs.some((c) => c.label === "Golden path")).toBe(true);
  });
  it("builds os design system trail", () => {
    const crumbs = getBreadcrumbs("/os/design-system");
    expect(crumbs.some((c) => c.label === "Design System v1")).toBe(true);
  });
  it("builds os web premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/web-premium/preview");
    expect(crumbs.some((c) => c.label === "Web Premium preview")).toBe(true);
  });
  it("builds os ecommerce checkout trail", () => {
    const crumbs = getBreadcrumbs("/os/ecommerce-premium/preview/checkout");
    expect(crumbs.some((c) => c.label === "Checkout")).toBe(true);
    expect(crumbs.some((c) => c.href === "/os/ecommerce-premium/preview")).toBe(true);
  });
  it("builds os seo premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/seo-premium/preview");
    expect(crumbs.some((c) => c.label === "SEO Premium audit")).toBe(true);
  });
  it("builds os ads premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/ads-premium/preview");
    expect(crumbs.some((c) => c.label === "Ads Premium campaign")).toBe(true);
  });
  it("builds os branding premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/branding-premium/preview");
    expect(crumbs.some((c) => c.label === "Branding Premium project")).toBe(true);
  });
  it("builds os voz premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/voz-premium/preview");
    expect(crumbs.some((c) => c.label === "Voz Premium delivery")).toBe(true);
  });
  it("builds os bots premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/bots-premium/preview");
    expect(crumbs.some((c) => c.label === "Bots Premium delivery")).toBe(true);
  });
  it("builds os personal digital premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/personal-digital-premium/preview");
    expect(crumbs.some((c) => c.label === "Personal Digital Premium delivery")).toBe(true);
  });
  it("builds os advisor empresarial premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/advisor-empresarial-premium/preview");
    expect(crumbs.some((c) => c.label === "Advisor Empresarial Premium delivery")).toBe(true);
  });
  it("builds os canales comunicaciones premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/canales-comunicaciones-premium/preview");
    expect(crumbs.some((c) => c.label === "Canales y Comunicaciones Premium delivery")).toBe(true);
  });
  it("builds os social media premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/social-media-premium/preview");
    expect(crumbs.some((c) => c.label === "Social Media Premium delivery")).toBe(true);
  });
  it("builds os email marketing premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/email-marketing-premium/preview");
    expect(crumbs.some((c) => c.label === "Email Marketing Premium delivery")).toBe(true);
  });
  it("builds os contenido copywriting premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/contenido-copywriting-premium/preview");
    expect(crumbs.some((c) => c.label === "Contenido y Copywriting Premium delivery")).toBe(true);
  });
  it("builds os video multimedia premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/video-multimedia-premium/preview");
    expect(crumbs.some((c) => c.label === "Video y Multimedia Premium delivery")).toBe(true);
  });
  it("builds os 3d inmersivo premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/3d-inmersivo-premium/preview");
    expect(crumbs.some((c) => c.label === "3D y Contenido Inmersivo Premium delivery")).toBe(true);
  });
  it("builds os fotografia producto premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/fotografia-producto-premium/preview");
    expect(crumbs.some((c) => c.label === "Fotografía de Producto Premium delivery")).toBe(true);
  });
  it("builds os diseno grafico premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/diseno-grafico-premium/preview");
    expect(crumbs.some((c) => c.label === "Diseño gráfico y creatividades Premium delivery")).toBe(true);
  });
  it("builds os consultoria automatizacion premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/consultoria-automatizacion-premium/preview");
    expect(crumbs.some((c) => c.label === "Consultoría de automatización Premium delivery")).toBe(true);
  });
  it("builds os integraciones apis premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/integraciones-apis-premium/preview");
    expect(crumbs.some((c) => c.label === "Integraciones y APIs Premium delivery")).toBe(true);
  });
  it("builds os mantenimiento web premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/mantenimiento-web-premium/preview");
    expect(crumbs.some((c) => c.label === "Mantenimiento web Premium delivery")).toBe(true);
  });
  it("builds os reputacion orm premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/reputacion-orm-premium/preview");
    expect(crumbs.some((c) => c.label === "Reputación online y ORM Premium delivery")).toBe(true);
  });
  it("builds os formacion capacitacion premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/formacion-capacitacion-premium/preview");
    expect(crumbs.some((c) => c.label === "Formación y capacitación digital Premium delivery")).toBe(true);
  });
  it("builds os influencer marketing premium preview trail", () => {
    const crumbs = getBreadcrumbs("/os/influencer-marketing-premium/preview");
    expect(crumbs.some((c) => c.label === "Influencer Marketing Premium delivery")).toBe(true);
  });
});
