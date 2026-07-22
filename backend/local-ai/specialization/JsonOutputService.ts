/**
 * Strict JSON extraction and validation for tool outputs.
 */
export type ToolCampaignJson = {
  tool: "create_campaign";
  args: {
    name: string;
    budget_eur: number;
    channels: string[];
  };
};

export function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export function parseToolJson(text: string): { ok: boolean; value?: ToolCampaignJson; error?: string } {
  try {
    const raw = JSON.parse(extractJsonObject(text)) as Record<string, unknown>;
    const normalized = normalizeToolCampaignShape(raw);
    if (raw.tool !== "create_campaign" && normalized) {
      return parseToolJson(JSON.stringify(normalized));
    }
    if (raw.tool !== "create_campaign") return { ok: false, error: "tool_not_create_campaign" };
    const args = raw.args as Record<string, unknown> | undefined;
    if (!args || typeof args.name !== "string") return { ok: false, error: "missing_name" };
    if (typeof args.budget_eur !== "number") return { ok: false, error: "missing_budget" };
    if (!Array.isArray(args.channels)) return { ok: false, error: "missing_channels" };
    return {
      ok: true,
      value: {
        tool: "create_campaign",
        args: {
          name: args.name,
          budget_eur: args.budget_eur,
          channels: args.channels.map(String),
        },
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "parse_error" };
  }
}

export function scoreToolJson(text: string, expected?: Partial<ToolCampaignJson["args"]>): number {
  const p = parseToolJson(text);
  if (!p.ok || !p.value) return 0;
  let score = 0.6;
  if (expected?.name && p.value.args.name.includes(expected.name)) score += 0.15;
  if (expected?.budget_eur != null && p.value.args.budget_eur === expected.budget_eur) score += 0.15;
  if (expected?.channels) {
    const has = expected.channels.every((c) => p.value!.args.channels.includes(c));
    if (has) score += 0.1;
  }
  return Math.min(1, score);
}

/** Restructure flat campaign JSON into strict tool schema when semantic fields match. */
export function normalizeToolCampaignShape(raw: Record<string, unknown>): ToolCampaignJson | null {
  if (raw.tool === "create_campaign" && raw.args) return null;
  const name = (raw.name ?? (raw.args as Record<string, unknown> | undefined)?.name) as string | undefined;
  const budget =
    (raw.budget_eur as number | undefined) ??
    (raw.budgetEur as number | undefined) ??
    ((raw.args as Record<string, unknown> | undefined)?.budget_eur as number | undefined);
  const channels = (raw.channels ?? (raw.args as Record<string, unknown> | undefined)?.channels) as unknown;
  if (typeof name !== "string" || typeof budget !== "number" || !Array.isArray(channels)) return null;
  return {
    tool: "create_campaign",
    args: { name, budget_eur: budget, channels: channels.map(String) },
  };
}

export function stringifyToolJson(value: ToolCampaignJson): string {
  return JSON.stringify(value);
}
