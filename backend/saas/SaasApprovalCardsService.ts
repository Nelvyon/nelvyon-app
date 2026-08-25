/**
 * S58 — Slack / Teams approval cards for pack deliverables.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { DbClient } from "../db/DbClient";
import { assertSafeEgressUrl } from "./safeEgressUrl";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type ApprovalChannel = "slack" | "teams";

export type ApprovalChannelSettings = {
  id: string;
  tenantId: string;
  channel: ApprovalChannel;
  slackTeamId: string | null;
  slackChannelId: string | null;
  teamsWebhookUrl: string | null;
  packApproveEnabled: boolean;
  deliverableApproveEnabled: boolean;
};

export type PackApprovalCardInput = {
  tenantId: string;
  packRunId: string;
  packName: string;
  qaScore: number;
  deliverableId?: string;
  portalApproveUrl?: string;
  portalRejectUrl?: string;
};

export class SaasApprovalCardsService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async getSettings(tenantId: string): Promise<ApprovalChannelSettings[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_approval_channel_settings WHERE tenant_id = $1`,
      [tenantId],
    );
    return rows.map((r) => this.mapSettings(r));
  }

  async upsertSettings(
    tenantId: string,
    input: Partial<ApprovalChannelSettings> & { channel: ApprovalChannel },
  ): Promise<ApprovalChannelSettings> {
    if (input.teamsWebhookUrl && !SaasApprovalCardsService.isSafeWebhookUrl(input.teamsWebhookUrl)) {
      throw new Error("teamsWebhookUrl must be a valid https URL");
    }
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_approval_channel_settings
         (tenant_id, channel, slack_team_id, slack_channel_id, teams_webhook_url,
          pack_approve_enabled, deliverable_approve_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, channel) DO UPDATE SET
         slack_team_id = COALESCE(EXCLUDED.slack_team_id, saas_approval_channel_settings.slack_team_id),
         slack_channel_id = COALESCE(EXCLUDED.slack_channel_id, saas_approval_channel_settings.slack_channel_id),
         teams_webhook_url = COALESCE(EXCLUDED.teams_webhook_url, saas_approval_channel_settings.teams_webhook_url),
         pack_approve_enabled = COALESCE(EXCLUDED.pack_approve_enabled, saas_approval_channel_settings.pack_approve_enabled),
         deliverable_approve_enabled = COALESCE(EXCLUDED.deliverable_approve_enabled, saas_approval_channel_settings.deliverable_approve_enabled),
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId,
        input.channel,
        input.slackTeamId ?? null,
        input.slackChannelId ?? null,
        input.teamsWebhookUrl ?? null,
        input.packApproveEnabled ?? true,
        input.deliverableApproveEnabled ?? true,
      ],
    );
    return this.mapSettings(rows[0]!);
  }

  buildSlackBlocks(input: PackApprovalCardInput): Record<string, unknown> {
    return {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `📦 Pack listo: ${input.packName}` },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*QA Score:* ${input.qaScore}/100\n*Pack Run:* \`${input.packRunId}\``,
          },
        },
        {
          type: "actions",
          elements: [
            ...(input.portalApproveUrl
              ? [{ type: "button", text: { type: "plain_text", text: "✅ Aprobar" }, url: input.portalApproveUrl, style: "primary" }]
              : []),
            ...(input.portalRejectUrl
              ? [{ type: "button", text: { type: "plain_text", text: "❌ Rechazar" }, url: input.portalRejectUrl, style: "danger" }]
              : []),
          ],
        },
      ],
    };
  }

  buildTeamsCard(input: PackApprovalCardInput): Record<string, unknown> {
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: `Pack ${input.packName} listo para revisión`,
      themeColor: "0084FF",
      title: `📦 ${input.packName} — QA ${input.qaScore}`,
      text: `Pack run \`${input.packRunId}\` completado. Revisa y aprueba en el portal.`,
      potentialAction: [
        ...(input.portalApproveUrl
          ? [{ "@type": "OpenUri", name: "Aprobar", targets: [{ os: "default", uri: input.portalApproveUrl }] }]
          : []),
        ...(input.portalRejectUrl
          ? [{ "@type": "OpenUri", name: "Rechazar", targets: [{ os: "default", uri: input.portalRejectUrl }] }]
          : []),
      ],
    };
  }

  async sendPackApprovalCard(input: PackApprovalCardInput): Promise<{ sent: string[] }> {
    const settings = await this.getSettings(input.tenantId);
    const sent: string[] = [];
    const slackToken = process.env.SLACK_BOT_TOKEN;

    for (const s of settings) {
      if (!s.packApproveEnabled) continue;
      if (s.channel === "slack" && s.slackChannelId && slackToken) {
        try {
          const res = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${slackToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              channel: s.slackChannelId,
              ...this.buildSlackBlocks(input),
            }),
          });
          const data = (await res.json()) as { ok?: boolean };
          if (data.ok) sent.push("slack");
        } catch {
          /* best-effort */
        }
      }
      if (s.channel === "teams" && s.teamsWebhookUrl) {
        try {
          const url = s.teamsWebhookUrl.trim();
          if (!url.startsWith("https://")) continue;
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.buildTeamsCard(input)),
          });
          sent.push("teams");
        } catch {
          /* best-effort */
        }
      }
    }
    return { sent };
  }

  verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
    const secret = process.env.SLACK_SIGNING_SECRET;
    if (!secret || !timestamp || !signature.startsWith("v0=")) return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
    const base = `v0:${timestamp}:${body}`;
    const expected = `v0=${createHmac("sha256", secret).update(base).digest("hex")}`;
    try {
      return timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
    } catch {
      return false;
    }
  }

  /**
   * Guarda de SSRF para webhooks salientes que configura el INQUILINO.
   *
   * Antes solo comprobaba que fuera `https:` y que hubiera host. Eso deja pasar
   * `https://169.254.169.254/...` -el endpoint de metadatos de la nube-,
   * `https://127.0.0.1/...` y cualquier direccion de la red interna. NELVYON
   * haria el POST desde DENTRO de su propia infraestructura, con lo que un
   * inquilino podia usarlo para alcanzar servicios que no estan expuestos.
   *
   * `esDestinoInterno` reutiliza los rangos que ya existian para el modo
   * privado: no hacia falta inventar una lista nueva y mantener dos.
   */
  static isSafeWebhookUrl(url: string): boolean {
    // Se DELEGA en la guarda canonica en vez de reimplementarla.
    //
    // Habia TRES copias de este control en el arbol: esta, `assertSafeEgressUrl`
    // -la buena, con bloqueo IPv4/IPv6, metadatos de nube y CGNAT- y los rangos
    // del modo privado. Tres copias del mismo control es garantia de que dos se
    // quedaran atras: esta era justamente la debil, la que solo miraba el
    // esquema.
    //
    // Una sola guarda, y las demas apuntando a ella.
    try {
      assertSafeEgressUrl(url.trim());
      return true;
    } catch {
      return false;
    }
  }

  private mapSettings(r: Record<string, unknown>): ApprovalChannelSettings {
    return {
      id: String(r.id),
      tenantId: String(r.tenant_id),
      channel: String(r.channel) as ApprovalChannel,
      slackTeamId: r.slack_team_id != null ? String(r.slack_team_id) : null,
      slackChannelId: r.slack_channel_id != null ? String(r.slack_channel_id) : null,
      teamsWebhookUrl: r.teams_webhook_url != null ? String(r.teams_webhook_url) : null,
      packApproveEnabled: Boolean(r.pack_approve_enabled),
      deliverableApproveEnabled: Boolean(r.deliverable_approve_enabled),
    };
  }
}

let _svc: SaasApprovalCardsService | undefined;
export function getSaasApprovalCardsService(): SaasApprovalCardsService {
  _svc ??= new SaasApprovalCardsService();
  return _svc;
}
export function resetSaasApprovalCardsServiceForTests(): void {
  _svc = undefined;
}
