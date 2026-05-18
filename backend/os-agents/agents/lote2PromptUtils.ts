import type { OsJobPayload } from "../types";
import { eliteCommonIntakeStrings } from "./elitePayloadStrings";

/** Replaces `{{KEY}}` placeholders (Lote 2 prompt convention). */
export function buildPrompt(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

/** Uppercase intake keys for Lote 2 templates ({{CLIENT_NAME}}, …). */
export function eliteLote2CommonVars(payload: OsJobPayload): Record<string, string> {
  const b = eliteCommonIntakeStrings(payload);
  return {
    CLIENT_NAME: b.clientName,
    INDUSTRY: b.industry,
    TARGET_AUDIENCE: b.targetAudience,
    TONE: b.tone,
    COMPETITORS: b.competitors,
    PRIMARY_COLOR: b.primaryColor,
    SECONDARY_COLOR: b.secondaryColor,
    BRIEF: b.brief,
    REFERENCE_URLS: b.referenceUrls,
  };
}
