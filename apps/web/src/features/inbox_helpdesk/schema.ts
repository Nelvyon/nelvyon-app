import { z } from "zod";

export const ticketCreateSchema = z.object({
  subject: z.string().min(3, "Subject is required"),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  channel: z.string().optional(),
});

export const ticketStatusSchema = z.object({
  status: z.string().min(2, "Status is required"),
});

export type TicketCreateValues = z.infer<typeof ticketCreateSchema>;
export type TicketStatusValues = z.infer<typeof ticketStatusSchema>;
