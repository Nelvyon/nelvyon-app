import { z } from "zod";

export const campaignFormSchema = z
  .object({
    project_id: z.string().min(1, "Project id is required"),
    client_id: z.string().optional(),
    platform: z.string().min(1, "Platform is required"),
    campaign_type: z.string().min(1, "Campaign type is required"),
    name: z.string().optional(),
    content: z.string().optional(),
    target_audience: z.string().optional(),
    status: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const pid = Number(val.project_id);
    if (!Number.isInteger(pid) || pid < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid project id", path: ["project_id"] });
    }
    if (val.client_id && val.client_id.trim()) {
      const cid = Number(val.client_id);
      if (!Number.isInteger(cid) || cid < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid client id", path: ["client_id"] });
      }
    }
  })
  .transform((data) => {
    const project_id = Number(data.project_id);
    let client_id: number | undefined;
    if (data.client_id && data.client_id.trim()) {
      client_id = Number(data.client_id);
    }
    return {
      project_id,
      client_id,
      platform: data.platform,
      campaign_type: data.campaign_type,
      name: data.name?.trim() || undefined,
      content: data.content?.trim() || undefined,
      target_audience: data.target_audience?.trim() || undefined,
      status: data.status?.trim() || undefined,
    };
  });

export type CampaignFormOutput = z.output<typeof campaignFormSchema>;
