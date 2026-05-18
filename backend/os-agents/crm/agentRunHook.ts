import { CrmService } from "./CrmService";

const MAX_SUMMARY_LEN = 50_000;

function outputSummary(output: { result?: unknown }): string {
  const r = output?.result;
  if (typeof r === "string") return r.slice(0, MAX_SUMMARY_LEN);
  try {
    return JSON.stringify(r ?? "").slice(0, MAX_SUMMARY_LEN);
  } catch {
    return "";
  }
}

/** Tras generar output en `run()`: registra actividad CRM si el input incluye `contactId`. Errores silenciados. */
export async function tryLogCrmAgentOutput(
  userId: string,
  input: unknown,
  output: { agentId?: string; result?: unknown },
): Promise<void> {
  try {
    const cid = String((input as { contactId?: string }).contactId ?? "").trim();
    if (!cid) return;
    await CrmService.logActivity(cid, userId, "agent_output", outputSummary(output), output.agentId);
  } catch {
    /* CRM opcional */
  }
}
