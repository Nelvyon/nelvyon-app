/**
 * Railway Private RAG prep — fail-closed helpers (no activation).
 * Schema apply / main-DB reuse require exact CEO/ops flags.
 * See docs/ops/RAILWAY_PRIVATE_RAG_PREP_RUNBOOK.md
 *
 * Precedence (database URL):
 * 1. LOCAL_AI_DATABASE_URL (explicit dedicated)
 * 2. DATABASE_URL only if NELVYON_LOCAL_AI_USE_MAIN_DB=1
 * 3. non-production only: owner-machine default 127.0.0.1:5434
 * 4. production: never (3) — fail-closed with clear blockedReason
 *
 * Production additionally rejects loopback / host.docker.internal URLs
 * even when explicitly set (ADR-069).
 */

import { resolveDeployEnvironment } from "../db/prodMigrateGate";

function isExactOne(raw: string | undefined): boolean {
  return (raw ?? "").trim() === "1";
}

/** Documented env precedence for ops / CEO docs (do not invent silent sources). */
export const LOCAL_AI_DATABASE_URL_PRECEDENCE = [
  "LOCAL_AI_DATABASE_URL",
  "DATABASE_URL when NELVYON_LOCAL_AI_USE_MAIN_DB=1",
  "non-prod owner default 127.0.0.1:5434 (FORBIDDEN in production)",
] as const;

/** Tables required for RAG runtime (must exist before inference). */
export const LOCAL_AI_RAG_REQUIRED_TABLES = [
  "local_ai_memory",
  "local_ai_rag_chunks",
  "local_ai_rag_documents",
  "local_ai_audit",
] as const;

/** Owner-machine Docker default — NEVER used in production. */
export const LOCAL_AI_OWNER_DEFAULT_DATABASE_URL =
  "postgresql://nelvyon_local_app:nelvyon_local_app_dev@127.0.0.1:5434/nelvyon_local_ai";

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

export function isLoopbackOrLocalDatabaseHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "0.0.0.0" ||
    h === "host.docker.internal"
  );
}

/** True when URL points at a local/loopback Postgres (forbidden in production). */
export function isLoopbackOrLocalDatabaseUrl(url: string): boolean {
  const raw = url.trim();
  if (!raw) return false;
  if (raw === LOCAL_AI_OWNER_DEFAULT_DATABASE_URL) return true;
  try {
    const normalized = raw.includes("://") ? raw : `postgresql://${raw}`;
    const u = new URL(normalized);
    return isLoopbackOrLocalDatabaseHostname(u.hostname);
  } catch {
    return /@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)[:/]/i.test(raw);
  }
}

export type LocalAiDatabaseResolve = {
  url: string | null;
  source: "LOCAL_AI_DATABASE_URL" | "DATABASE_URL" | "none";
  blockedReason: string | null;
};

export function resolveLocalAiDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): LocalAiDatabaseResolve {
  const { isProduction } = resolveDeployEnvironment(env);

  const dedicated = (env.LOCAL_AI_DATABASE_URL ?? "").trim();
  if (dedicated) {
    if (isProduction && isLoopbackOrLocalDatabaseUrl(dedicated)) {
      return {
        url: null,
        source: "none",
        blockedReason:
          "LOCAL_AI_DATABASE_URL points at localhost/loopback — forbidden in production (ADR-069)",
      };
    }
    return { url: dedicated, source: "LOCAL_AI_DATABASE_URL", blockedReason: null };
  }

  const main = (env.DATABASE_URL ?? "").trim();
  if (main && isLocalAiUseMainDbEnabled(env)) {
    if (isProduction && isLoopbackOrLocalDatabaseUrl(main)) {
      return {
        url: null,
        source: "none",
        blockedReason:
          "DATABASE_URL is loopback while NELVYON_LOCAL_AI_USE_MAIN_DB=1 — forbidden in production (ADR-069)",
      };
    }
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

  // Never invent owner-machine localhost here — getLocalAiConfig may apply
  // LOCAL_AI_OWNER_DEFAULT_DATABASE_URL only when NOT production.
  return {
    url: null,
    source: "none",
    blockedReason: isProduction
      ? "PRIVATE_AI_RAG_BLOCKED: no RAG database configured in production (refusing 127.0.0.1:5434 fallback). Set LOCAL_AI_DATABASE_URL or NELVYON_LOCAL_AI_USE_MAIN_DB=1 after CEO-authorized local_ai_* schema — or keep AI off"
      : "No DATABASE_URL / LOCAL_AI_DATABASE_URL",
  };
}

/**
 * Fail-closed before pool connect / inference. Does not apply DDL.
 * Clear error — never silently reaches localhost Postgres in production.
 */
export function assertLocalAiDatabaseUrlReady(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const { isProduction } = resolveDeployEnvironment(env);
  const resolved = resolveLocalAiDatabaseUrl(env);
  let url = resolved.url;
  if (!url && !isProduction) {
    url = LOCAL_AI_OWNER_DEFAULT_DATABASE_URL;
  }
  if (!url) {
    throw new Error(
      resolved.blockedReason ??
        "PRIVATE_AI_RAG_BLOCKED: RAG database URL unresolved",
    );
  }
  if (isProduction && isLoopbackOrLocalDatabaseUrl(url)) {
    throw new Error(
      "PRIVATE_AI_RAG_BLOCKED: production must not use localhost/loopback RAG database (ADR-069)",
    );
  }
  return url;
}

export type SchemaPresenceClient = {
  query: (sql: string) => Promise<{ rows: Array<{ tablename?: string }> }>;
};

/** Verify local_ai_* tables exist — fail-closed, no DDL. */
export async function assertLocalAiRagSchemaPresent(
  client: SchemaPresenceClient,
): Promise<void> {
  const result = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'local_ai_%'`,
  );
  const names = new Set(result.rows.map((r) => String(r.tablename ?? "")));
  const missing = LOCAL_AI_RAG_REQUIRED_TABLES.filter((t) => !names.has(t));
  if (missing.length > 0) {
    throw new Error(
      `PRIVATE_AI_RAG_BLOCKED: missing RAG schema tables (${missing.join(", ")}). Do not run inference; apply schema only with CEO-approved NELVYON_LOCAL_AI_SCHEMA_APPLY=1 (staging first)`,
    );
  }
}

/**
 * Full runtime gate for inference: URL configured (non-loopback in prod) + schema present.
 * Call before executeTask RAG/DB work. Never applies migrations.
 */
export async function assertLocalAiRuntimeReadyForInference(
  env: NodeJS.ProcessEnv = process.env,
  clientFactory?: () => Promise<SchemaPresenceClient>,
): Promise<void> {
  assertLocalAiDatabaseUrlReady(env);
  if (!clientFactory) return;
  const client = await clientFactory();
  await assertLocalAiRagSchemaPresent(client);
}

export function assertSchemaApplyAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (!isLocalAiSchemaApplyEnabled(env)) {
    throw new Error(
      "BLOCKED: NELVYON_LOCAL_AI_SCHEMA_APPLY must be exactly '1' to apply local_ai schema (PREPARED_OFF until CEO)",
    );
  }
}
