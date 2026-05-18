import { z } from "zod";

export const clientFormSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  sector: z.string().min(2, "Sector is required"),
  country: z.string().optional(),
  city: z.string().optional(),
  website_url: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
