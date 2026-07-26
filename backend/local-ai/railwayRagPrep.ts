/**
 * Railway Private RAG prep — fail-closed helpers (no activation).
 * Schema apply / main-DB reuse require exact CEO/ops flags.
 * See docs/ops/RAILWAY_PRIVATE_RAG_PREP_RUNBOOK.md
 */

function isExactOne(raw: string | undefined): boolean {
  return (raw ?? "").trim() === "1";
}

/** Allow applying local_ai_* DDL. Default OFF. */
export function isLocalAiSchemaApplyEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isExactOne(env.NELVYON_LOCAL_AI_SCHEMA_APPLY);
}

/** Allow LocalVectorStore to use shared DATABASE_URL when LOCAL_AI_DATABASE_URL absent. Default OFF. */
export function isLocalAiUseMainDbEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isExactOne(env.NELVYON_LOCAL_AI_USE_MAIN_DB);
}

export function resolveLocalAiDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): { url: string | null; source: "LOCAL_AI_DATABASE_URL" | "DATABASE_URL" | "none"; blockedReason: string | null } {
  const dedicated = (env.LOCAL_AI_DATABASE_URL ?? "").trim();
  if (dedicated) {
    return { url: dedicated, source: "LOCAL_AI_DATABASE_URL", blockedReason: null };
  }
  const main = (env.DATABASE_URL ?? "").trim();
  if (main && isLocalAiUseMainDbEnabled(env)) {
    return { url: main, source: "DATABASE_URL", blockedReason: null };
  }
  if (main && !isLocalAiUseMainDbEnabled(env)) {
    return {
      url: null,
      source: "none",
      blockedReason:
        "LOCAL_AI_DATABASE_URL absent; set NELVYON_LOCAL_AI_USE_MAIN_DB=1 only after CEO approve shared-DB RAG schema",
    };
  }
  return { url: null, source: "none", blockedReason: "No DATABASE_URL / LOCAL_AI_DATABASE_URL" };
}

export function assertSchemaApplyAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (!isLocalAiSchemaApplyEnabled(env)) {
    throw new Error(
      "BLOCKED: NELVYON_LOCAL_AI_SCHEMA_APPLY must be exactly '1' to apply local_ai schema (PREPARED_OFF until CEO)",
    );
  }
}
