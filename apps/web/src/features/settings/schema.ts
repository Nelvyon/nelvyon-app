import { z } from "zod";

export const SETTINGS_TIMEZONES = [
  "UTC",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export const tenantProfileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  logo_url: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
  timezone: z.enum(SETTINGS_TIMEZONES as unknown as [string, ...string[]]),
});

export type TenantProfileFormValues = z.infer<typeof tenantProfileSchema>;

export const memberInviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "operator", "member", "viewer"]),
});

export type MemberInviteFormValues = z.infer<typeof memberInviteSchema>;
