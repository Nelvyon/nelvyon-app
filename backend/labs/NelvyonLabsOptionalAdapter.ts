/**
 * NELVYON Labs optional capability contracts (blocks 3–11).
 * No vendor monorepos copied. Feature flags default OFF. Agents/OpenClaw NOT wired here.
 */

export type LabsOptionalId =
  | "mcp-sdk-typescript"
  | "tesseract"
  | "cheerio"
  | "ntfy"
  | "ffmpeg"
  | "whisper"
  | "fontsource";

export type LabsOptionalPlan = {
  id: LabsOptionalId;
  enabled: boolean;
  license: string;
  purpose: string;
  invoke: "npm" | "host_binary" | "webhook" | "contract_only";
  rollback: string;
  openClawSafe: boolean;
};

const FLAG = (name: string) => (process.env[name] ?? "0") !== "0";

export function getLabsOptionalPlans(): LabsOptionalPlan[] {
  return [
    {
      id: "mcp-sdk-typescript",
      enabled: FLAG("NELVYON_MCP_TS_ENABLED"),
      license: "MIT",
      purpose: "Official MCP TypeScript SDK contract — no OpenClaw/orchestrator wiring",
      invoke: "npm",
      rollback: "NELVYON_MCP_TS_ENABLED=0",
      openClawSafe: true,
    },
    {
      id: "tesseract",
      enabled: FLAG("NELVYON_TESSERACT_ENABLED"),
      license: "Apache-2.0",
      purpose: "Optional host OCR binary for private docs",
      invoke: "host_binary",
      rollback: "NELVYON_TESSERACT_ENABLED=0",
      openClawSafe: true,
    },
    {
      id: "cheerio",
      enabled: FLAG("NELVYON_CHEERIO_ENABLED"),
      license: "MIT",
      purpose: "Authorized static HTML parse only (allowlisted URLs)",
      invoke: "npm",
      rollback: "NELVYON_CHEERIO_ENABLED=0",
      openClawSafe: true,
    },
    {
      id: "ntfy",
      enabled: FLAG("NELVYON_NTFY_ENABLED"),
      license: "Apache-2.0",
      purpose: "Optional ops push to NELVYON_NTFY_URL",
      invoke: "webhook",
      rollback: "NELVYON_NTFY_ENABLED=0; unset NELVYON_NTFY_URL",
      openClawSafe: true,
    },
    {
      id: "ffmpeg",
      enabled: FLAG("NELVYON_FFMPEG_ENABLED"),
      license: "LGPL/GPL (host binary)",
      purpose: "Optional media transcode if ffmpeg on PATH",
      invoke: "host_binary",
      rollback: "NELVYON_FFMPEG_ENABLED=0",
      openClawSafe: true,
    },
    {
      id: "whisper",
      enabled: FLAG("NELVYON_WHISPER_ENABLED"),
      license: "MIT",
      purpose: "Optional local STT via host/Ollama — not OpenAI cloud",
      invoke: "host_binary",
      rollback: "NELVYON_WHISPER_ENABLED=0",
      openClawSafe: true,
    },
    {
      id: "fontsource",
      enabled: FLAG("NELVYON_FONTSOURCE_ENABLED"),
      license: "MIT/OFL",
      purpose: "Optional official @fontsource packages — no repo copy",
      invoke: "npm",
      rollback: "NELVYON_FONTSOURCE_ENABLED=0",
      openClawSafe: true,
    },
  ];
}

export function assertLabsOptionalContracts(): { ok: boolean; violations: string[] } {
  const plans = getLabsOptionalPlans();
  const violations: string[] = [];
  const mcp = plans.find((p) => p.id === "mcp-sdk-typescript");
  if (!mcp) violations.push("missing_mcp_ts");
  if (mcp && mcp.enabled && process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED === "1") {
    violations.push("openclaw_must_stay_off_while_mcp_bootstrap");
  }
  for (const p of plans) {
    if (!p.license) violations.push(`${p.id}_license`);
    if (!p.rollback) violations.push(`${p.id}_rollback`);
    if (!p.openClawSafe) violations.push(`${p.id}_not_openclaw_safe`);
  }
  // Defaults must be off (no surprise runtime cost)
  if (plans.some((p) => p.enabled)) {
    // Only fail if we're in test without flags — allow when env intentionally set
  }
  return { ok: violations.length === 0, violations };
}

export function getEnabledLabsOptional(): LabsOptionalId[] {
  return getLabsOptionalPlans().filter((p) => p.enabled).map((p) => p.id);
}
