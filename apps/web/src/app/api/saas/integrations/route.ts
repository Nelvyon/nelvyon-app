import { NextResponse } from "next/server";
import {
  getSaasAdsDashboardService,
  getSaasKlaviyoService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IntegrationStatus = "connected" | "disconnected" | "error";

interface IntegrationInfo {
  id: string;
  provider: string;
  displayName: string;
  icon: string;
  status: IntegrationStatus;
  connectedAccount: string | null;
  envRequired: string[];
  note: string | null;
}

/** GET /api/saas/integrations — returns real integration status for all providers */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");

    // Ads platforms (OAuth-based, stored in DB)
    let adsStatuses: Array<{ platform: string; connected: boolean; accountName?: string }> = [];
    try {
      adsStatuses = await getSaasAdsDashboardService().getStatus(ctx.tenant.id);
    } catch { /* non-fatal */ }

    // Klaviyo (env-based)
    const klaviyoStatus = await getSaasKlaviyoService().getStatus();

    // Env-based integrations
    const sesConfigured = !!(process.env.SES_ACCESS_KEY_ID && process.env.SES_FROM_EMAIL);
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
    const openaiConfigured = !!process.env.OPENAI_API_KEY;

    const integrations: IntegrationInfo[] = [
      // Ads OAuth (DB-backed)
      ...adsStatuses.map((s) => ({
        id: s.platform,
        provider: s.platform,
        displayName: s.platform === "meta" ? "Meta Ads" : s.platform === "google" ? "Google Ads" : s.platform === "linkedin" ? "LinkedIn Ads" : "TikTok Ads",
        icon: s.platform === "meta" ? "📘" : s.platform === "google" ? "🔍" : s.platform === "linkedin" ? "💼" : "🎵",
        status: (s.connected ? "connected" : "disconnected") as IntegrationStatus,
        connectedAccount: s.accountName ?? null,
        envRequired: [],
        note: s.connected ? null : "Conecta tu cuenta en /saas/publicidad",
      })),
      // Email
      {
        id: "ses", provider: "ses", displayName: "AWS SES (Email)", icon: "📧",
        status: (sesConfigured ? "connected" : "disconnected") as IntegrationStatus,
        connectedAccount: sesConfigured ? (process.env.SES_FROM_EMAIL ?? null) : null,
        envRequired: ["SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL"],
        note: sesConfigured ? null : "Configura SES_ACCESS_KEY_ID + SES_FROM_EMAIL en Railway",
      },
      // SMS / WhatsApp
      {
        id: "twilio", provider: "twilio", displayName: "Twilio (SMS + WhatsApp)", icon: "💬",
        status: (twilioConfigured ? "connected" : "disconnected") as IntegrationStatus,
        connectedAccount: twilioConfigured ? (process.env.TWILIO_ACCOUNT_SID ?? null) : null,
        envRequired: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
        note: twilioConfigured ? null : "Configura TWILIO_* en Railway",
      },
      // Stripe
      {
        id: "stripe", provider: "stripe", displayName: "Stripe (Billing)", icon: "💳",
        status: (stripeConfigured ? "connected" : "disconnected") as IntegrationStatus,
        connectedAccount: null,
        envRequired: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
        note: stripeConfigured ? null : "Configura STRIPE_SECRET_KEY en Railway",
      },
      // Klaviyo
      {
        id: "klaviyo", provider: "klaviyo", displayName: "Klaviyo (Email Marketing)", icon: "📮",
        status: (klaviyoStatus.configured ? "connected" : "disconnected") as IntegrationStatus,
        connectedAccount: klaviyoStatus.accountEmail,
        envRequired: ["KLAVIYO_API_KEY"],
        note: klaviyoStatus.configured ? null : "Configura KLAVIYO_API_KEY en Railway",
      },
      // OpenAI
      {
        id: "openai", provider: "openai", displayName: "OpenAI (IA)", icon: "🤖",
        status: (openaiConfigured ? "connected" : "disconnected") as IntegrationStatus,
        connectedAccount: null,
        envRequired: ["OPENAI_API_KEY"],
        note: openaiConfigured ? null : "Configura OPENAI_API_KEY en Railway",
      },
    ];

    return NextResponse.json({ integrations, configured: integrations.filter((i) => i.status === "connected").length });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
