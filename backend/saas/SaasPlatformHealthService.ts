import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getSaasIntegrationsHubService } from "./SaasIntegrationsHubService";
import { getSaasSmsService } from "./SaasSmsService";
import { getSaasDialerService } from "./SaasDialerService";
import { getSaasWhatsAppCloudService } from "./SaasWhatsAppCloudService";
import {
  isSesEnvConfigured,
  isStripeEnvConfigured,
  isTwilioEnvConfigured,
  missingEnvKeys,
} from "./saasEnv";

export type HealthItemStatus = "ok" | "warning" | "missing";

export type PlatformHealthItem = {
  id: string;
  label: string;
  category: "platform" | "comms" | "payments" | "integrations" | "product";
  status: HealthItemStatus;
  configured: boolean;
  href: string;
  detail: string;
  /** Tenant can fix without platform operator */
  actionable: boolean;
};

export type ActivationSteps = {
  profile: boolean;
  contact: boolean;
  campaign: boolean;
  workflow: boolean;
  social: boolean;
  billing: boolean;
};

export type PlatformHealthReport = {
  score: number;
  status: "healthy" | "degraded" | "critical";
  timestamp: string;
  items: PlatformHealthItem[];
  activation: {
    steps: ActivationSteps;
    done: number;
    total: number;
    percent: number;
  };
  summary: {
    platformReady: boolean;
    productReady: boolean;
    missingCount: number;
  };
};

function itemStatus(configured: boolean, optional = false): HealthItemStatus {
  if (configured) return "ok";
  return optional ? "warning" : "missing";
}

function scoreFromItems(items: PlatformHealthItem[], activationPercent: number): number {
  const weights = { platform: 0.35, comms: 0.15, payments: 0.15, integrations: 0.15, product: 0.2 };
  let weighted = 0;
  let totalWeight = 0;
  for (const cat of Object.keys(weights) as Array<keyof typeof weights>) {
    const group = items.filter((i) => i.category === cat);
    if (group.length === 0) continue;
    const ok = group.filter((i) => i.status === "ok").length;
    const pct = ok / group.length;
    weighted += pct * weights[cat];
    totalWeight += weights[cat];
  }
  const itemScore = totalWeight > 0 ? (weighted / totalWeight) * 100 : 0;
  return Math.round(itemScore * 0.75 + activationPercent * 0.25);
}

function aggregateStatus(score: number): PlatformHealthReport["status"] {
  if (score >= 90) return "healthy";
  if (score >= 60) return "degraded";
  return "critical";
}

async function loadActivationSteps(
  db: SaasPostgresPort,
  tenantId: string,
): Promise<ActivationSteps> {
  const rows = await db.query<{
    step_profile: boolean;
    step_contact: boolean;
    step_campaign: boolean;
    step_workflow: boolean;
    step_social: boolean;
    step_billing: boolean;
  }>(
    `SELECT step_profile, step_contact, step_campaign, step_workflow, step_social, step_billing
     FROM saas_activation_checklist WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  ).catch(() => []);

  if (rows.length === 0) {
    return {
      profile: false,
      contact: false,
      campaign: false,
      workflow: false,
      social: false,
      billing: false,
    };
  }
  const r = rows[0];
  return {
    profile: r.step_profile,
    contact: r.step_contact,
    campaign: r.step_campaign,
    workflow: r.step_workflow,
    social: r.step_social,
    billing: r.step_billing,
  };
}

export class SaasPlatformHealthService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async getReport(tenantId: string, userId?: string): Promise<PlatformHealthReport> {
    const [connections, smsStatus, dialerConfig, waConfig, activation] = await Promise.all([
      getSaasIntegrationsHubService().listConnections(tenantId, userId),
      Promise.resolve(getSaasSmsService().getStatus()),
      Promise.resolve(getSaasDialerService().getConfig()),
      getSaasWhatsAppCloudService().getConfig(),
      loadActivationSteps(this.db, tenantId),
    ]);

    const conn = (slug: string) => connections.find((c) => c.slug === slug);
    const metaConn = conn("meta");
    const googleConn = conn("google");

    const sesOk = isSesEnvConfigured();
    const twilioOk = isTwilioEnvConfigured() || smsStatus.configured;
    const stripeOk = isStripeEnvConfigured();
    const whatsappOk = waConfig.configured || Boolean(conn("whatsapp")?.status === "connected");

    const activationValues = Object.values(activation);
    const activationDone = activationValues.filter(Boolean).length;
    const activationTotal = activationValues.length;
    const activationPercent = activationTotal > 0 ? Math.round((activationDone / activationTotal) * 100) : 0;

    const productStepsDone =
      activation.contact && activation.workflow && (activation.campaign || activation.social);

    const items: PlatformHealthItem[] = [
      {
        id: "ses",
        label: "Email (AWS SES)",
        category: "platform",
        configured: sesOk,
        status: itemStatus(sesOk),
        href: "/saas/campanias",
        detail: sesOk
          ? "Envío de campañas y workflows por email activo."
          : `Pendiente: ${missingEnvKeys(["SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL"]).join(", ") || "configuración SES"}`,
        actionable: false,
      },
      {
        id: "stripe",
        label: "Pagos (Stripe)",
        category: "payments",
        configured: stripeOk,
        status: itemStatus(stripeOk),
        href: "/saas/billing",
        detail: stripeOk
          ? "Cobros y planes Stripe listos."
          : "Claves Stripe o price IDs pendientes en la plataforma.",
        actionable: false,
      },
      {
        id: "twilio",
        label: "SMS y llamadas (Twilio)",
        category: "comms",
        configured: twilioOk,
        status: itemStatus(twilioOk, true),
        href: "/saas/sms",
        detail: twilioOk
          ? `SMS activo${smsStatus.fromNumber ? ` · ${smsStatus.fromNumber}` : ""}.`
          : "Twilio no configurado — SMS y dialer en modo limitado.",
        actionable: false,
      },
      {
        id: "whatsapp",
        label: "WhatsApp Business",
        category: "comms",
        configured: whatsappOk,
        status: itemStatus(whatsappOk, true),
        href: "/saas/whatsapp",
        detail: whatsappOk
          ? `WhatsApp conectado${waConfig.provider ? ` (${waConfig.provider})` : ""}.`
          : "Conecta Meta Cloud API o Twilio WhatsApp.",
        actionable: true,
      },
      {
        id: "dialer",
        label: "Dialer",
        category: "comms",
        configured: dialerConfig.configured,
        status: itemStatus(dialerConfig.configured, true),
        href: "/saas/dialer",
        detail: dialerConfig.configured
          ? "Llamadas salientes listas."
          : "Requiere Twilio configurado.",
        actionable: false,
      },
      {
        id: "meta",
        label: "Meta (Ads + Social)",
        category: "integrations",
        configured: metaConn?.status === "connected",
        status: itemStatus(metaConn?.status === "connected", true),
        href: "/saas/integraciones",
        detail: metaConn?.status === "connected"
          ? `Conectado${metaConn.connectedAccount ? `: ${metaConn.connectedAccount}` : ""}.`
          : "Conecta tu cuenta Meta para publicidad y redes.",
        actionable: true,
      },
      {
        id: "google",
        label: "Google (Ads + Analytics)",
        category: "integrations",
        configured: googleConn?.status === "connected",
        status: itemStatus(googleConn?.status === "connected", true),
        href: "/saas/integraciones",
        detail: googleConn?.status === "connected"
          ? `Conectado${googleConn.connectedAccount ? `: ${googleConn.connectedAccount}` : ""}.`
          : "Conecta Google para Ads y analítica.",
        actionable: true,
      },
      {
        id: "activation",
        label: "Primeros pasos del producto",
        category: "product",
        configured: productStepsDone,
        status: itemStatus(productStepsDone),
        href: "/saas/setup",
        detail: productStepsDone
          ? "CRM, automatización y campañas iniciados."
          : `${activationDone}/${activationTotal} pasos de activación completados.`,
        actionable: true,
      },
    ];

    const missingCount = items.filter((i) => i.status !== "ok").length;
    const score = scoreFromItems(items, activationPercent);
    const platformReady = sesOk && stripeOk;
    const productReady = productStepsDone && score >= 80;

    return {
      score,
      status: aggregateStatus(score),
      timestamp: new Date().toISOString(),
      items,
      activation: {
        steps: activation,
        done: activationDone,
        total: activationTotal,
        percent: activationPercent,
      },
      summary: {
        platformReady,
        productReady,
        missingCount,
      },
    };
  }
}

let _svc: SaasPlatformHealthService | undefined;
export function getSaasPlatformHealthService(): SaasPlatformHealthService {
  if (!_svc) _svc = new SaasPlatformHealthService();
  return _svc;
}

export function resetSaasPlatformHealthServiceForTests(): void {
  _svc = undefined;
}
