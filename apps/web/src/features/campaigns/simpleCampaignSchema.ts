import { z } from "zod";

const PLATFORMS = ["email", "sms", "social", "multichannel"] as const;
const TYPES = ["awareness", "nurturing", "conversion", "retention"] as const;

/** User-facing campaign form — no internal project IDs. */
export const simpleCampaignFormSchema = z
  .object({
    client_id: z.string().min(1, "Selecciona un cliente"),
    name: z.string().min(1, "El nombre de la campaña es obligatorio"),
    platform: z.enum(PLATFORMS, { message: "Selecciona un canal" }),
    campaign_type: z.enum(TYPES, { message: "Selecciona un objetivo" }),
    content: z.string().optional(),
    target_audience: z.string().optional(),
  })
  .transform((data) => {
    const client_id = Number(data.client_id);
    return {
      project_id: client_id,
      client_id,
      platform: data.platform,
      campaign_type: data.campaign_type,
      name: data.name.trim(),
      content: data.content?.trim() || undefined,
      target_audience: data.target_audience?.trim() || undefined,
      status: "draft",
    };
  });

export type SimpleCampaignFormOutput = z.output<typeof simpleCampaignFormSchema>;

export const CAMPAIGN_PLATFORM_LABELS: Record<(typeof PLATFORMS)[number], string> = {
  email: "Email",
  sms: "SMS",
  social: "Redes sociales",
  multichannel: "Multicanal",
};

export const CAMPAIGN_TYPE_LABELS: Record<(typeof TYPES)[number], string> = {
  awareness: "Notoriedad",
  nurturing: "Nurturing",
  conversion: "Conversión",
  retention: "Retención",
};
