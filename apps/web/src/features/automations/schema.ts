import { z } from "zod";

export const webhookActiveSchema = z.object({
  is_active: z.boolean(),
});

export type WebhookActiveValues = z.infer<typeof webhookActiveSchema>;
