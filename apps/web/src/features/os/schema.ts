import { z } from "zod";

export const osHealthLevelSchema = z.enum(["ok", "attention", "critical"]);

export type OsHealthLevel = z.infer<typeof osHealthLevelSchema>;

export function deriveOsHealthLevel(input: {
  failed: number;
  pending: number;
  usageAlerts: number;
}): OsHealthLevel {
  let raw: OsHealthLevel = "ok";
  if (input.failed > 0) raw = "critical";
  else if (input.usageAlerts > 0 || input.pending > 5) raw = "attention";
  return osHealthLevelSchema.parse(raw);
}
