import { getLocalAiPool } from "./db";
import { getLocalAiConfig } from "./config";
import { getLocalEmbeddingProvider } from "./LocalEmbeddingProvider";
import { getPrivateModeStatus, isPrivateMode } from "../private-ai/privateMode";

export type LocalAiHealthReport = {
  ok: boolean;
  privateMode: ReturnType<typeof getPrivateModeStatus>;
  postgres: { ok: boolean; detail?: string };
  pgvector: { ok: boolean; detail?: string };
  schema: { ok: boolean; tables: string[] };
  ollama: { ok: boolean; detail?: string };
  embeddingModel: string;
  storageDir: string;
};

export async function runLocalAiHealthCheck(): Promise<LocalAiHealthReport> {
  const cfg = getLocalAiConfig();
  const report: LocalAiHealthReport = {
    ok: false,
    privateMode: getPrivateModeStatus(),
    postgres: { ok: false },
    pgvector: { ok: false },
    schema: { ok: false, tables: [] },
    ollama: { ok: false },
    embeddingModel: cfg.embeddingModel,
    storageDir: cfg.storageDir,
  };

  try {
    const pool = getLocalAiPool();
    await pool.query("SELECT 1");
    report.postgres = { ok: true };
  } catch (e) {
    report.postgres = { ok: false, detail: e instanceof Error ? e.message : String(e) };
    return report;
  }

  try {
    const ext = await getLocalAiPool().query(
      `SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto')`,
    );
    const names = ext.rows.map((r: { extname: string }) => String(r.extname));
    report.pgvector = { ok: names.includes("vector") && names.includes("pgcrypto"), detail: names.join(",") };
  } catch (e) {
    report.pgvector = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  try {
    const tables = await getLocalAiPool().query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'local_ai_%' ORDER BY 1`,
    );
    const names = tables.rows.map((r: { tablename: string }) => r.tablename);
    const required = ["local_ai_memory", "local_ai_rag_chunks", "local_ai_rag_documents", "local_ai_audit"];
    report.schema = { ok: required.every((t) => names.includes(t)), tables: names };
  } catch (e) {
    report.schema = { ok: false, tables: [], detail: e instanceof Error ? e.message : String(e) } as never;
  }

  try {
    const ollamaOk = await getLocalEmbeddingProvider().isAvailable();
    report.ollama = {
      ok: ollamaOk,
      detail: ollamaOk ? "reachable" : "not running or model not pulled (expected until owner selects model)",
    };
  } catch (e) {
    report.ollama = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  report.ok =
    isPrivateMode() &&
    report.postgres.ok &&
    report.pgvector.ok &&
    report.schema.ok;

  return report;
}
