/**
 * O15 — OsEnvatoSeedService unit tests
 */
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  OsEnvatoSeedService,
  OsEnvatoSeedError,
  type SeedDbPort,
} from "../OsEnvatoSeedService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SeedDbPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SeedDbPort;
}

const NO_DATA = makeDb(() => []);

// Temp metadata fixture file
let metadataPath: string;

beforeAll(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "o15-seeds-"));
  metadataPath = path.join(dir, "envato-seeds-metadata.json");
  fs.writeFileSync(
    metadataPath,
    JSON.stringify([
      { id: "dental-001", sector: "dental", source: "synthetic", headline: "Clínica Dental", meta_title: "X", cta_label: "Pedir cita", chatbot_greeting: "Hola", downloaded_at: null, envato_id: null },
      { id: "legal-001", sector: "legal", source: "envato", headline: "Despacho Legal", meta_title: "Y", cta_label: "Consultar", chatbot_greeting: "Hola", downloaded_at: "2026-06-01T00:00:00Z", envato_id: "env-123", preview_url: "https://cdn/p.png" },
      { id: "", sector: "bad", source: "synthetic", headline: "skip me", downloaded_at: null, envato_id: null },
    ]),
  );
});

afterAll(() => {
  try { fs.rmSync(path.dirname(metadataPath), { recursive: true, force: true }); } catch { /* ignore */ }
});

function row(over: Record<string, unknown> = {}) {
  return {
    id: "dental-001", sector: "dental", source: "synthetic", envato_id: null,
    headline: "Clínica Dental", meta_title: "X", cta_label: "Pedir cita",
    chatbot_greeting: "Hola", preview_url: null, zip_path: null, downloaded_at: null,
    download_status: "metadata_only", metadata: {}, ...over,
  };
}

// ── readMetadataFile ─────────────────────────────────────────────────────────────

describe("OsEnvatoSeedService — readMetadataFile", () => {
  it("reads + parses the metadata file", () => {
    const svc = new OsEnvatoSeedService(NO_DATA, metadataPath);
    const entries = svc.readMetadataFile();
    expect(entries.length).toBe(3);
  });

  it("throws METADATA_MISSING when file absent", () => {
    const svc = new OsEnvatoSeedService(NO_DATA, "/no/such/file.json");
    expect(() => svc.readMetadataFile()).toThrow(OsEnvatoSeedError);
  });
});

// ── syncFromMetadataFile ─────────────────────────────────────────────────────────

describe("OsEnvatoSeedService — syncFromMetadataFile", () => {
  it("upserts valid entries and skips entries missing id/sector/headline", async () => {
    const seen: unknown[][] = [];
    const db = makeDb((sql, params) => {
      if (sql.includes("INSERT INTO os_envato_seed_registry")) {
        seen.push(params);
        // first row inserted, second updated
        return [{ inserted: seen.length === 1 }];
      }
      return [];
    });
    const svc = new OsEnvatoSeedService(db, metadataPath);
    const res = await svc.syncFromMetadataFile();
    expect(res.synced).toBe(2); // the empty-id entry is skipped
    expect(res.inserted).toBe(1);
    expect(res.updated).toBe(1);
  });

  it("maps downloaded_at to download_status=downloaded", async () => {
    let legalParams: unknown[] = [];
    const db = makeDb((sql, params) => {
      if (sql.includes("INSERT INTO os_envato_seed_registry")) {
        if ((params as unknown[])[0] === "legal-001") legalParams = params as unknown[];
        return [{ inserted: true }];
      }
      return [];
    });
    const svc = new OsEnvatoSeedService(db, metadataPath);
    await svc.syncFromMetadataFile();
    // last param is download_status
    expect(legalParams[legalParams.length - 1]).toBe("downloaded");
  });

  it("is idempotent (re-sync updates, not duplicates)", async () => {
    const db = makeDb((sql) =>
      sql.includes("INSERT INTO os_envato_seed_registry") ? [{ inserted: false }] : [],
    );
    const svc = new OsEnvatoSeedService(db, metadataPath);
    const res = await svc.syncFromMetadataFile();
    expect(res.inserted).toBe(0);
    expect(res.updated).toBe(2);
  });
});

// ── listCatalog ──────────────────────────────────────────────────────────────────

describe("OsEnvatoSeedService — listCatalog", () => {
  it("maps rows to items", async () => {
    const db = makeDb(() => [row(), row({ id: "dental-002" })]);
    const svc = new OsEnvatoSeedService(db, metadataPath);
    const items = await svc.listCatalog();
    expect(items).toHaveLength(2);
    expect(items[0]!.id).toBe("dental-001");
  });

  it("applies sector filter param", async () => {
    const db = makeDb(() => []) as SeedDbPort & { query: ReturnType<typeof vi.fn> };
    const svc = new OsEnvatoSeedService(db, metadataPath);
    await svc.listCatalog({ sector: "dental" });
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("dental");
  });

  it("clamps limit to <=500", async () => {
    const db = makeDb(() => []) as SeedDbPort & { query: ReturnType<typeof vi.fn> };
    const svc = new OsEnvatoSeedService(db, metadataPath);
    await svc.listCatalog({ limit: 9999 });
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params[params.length - 1]).toBe(500);
  });
});

// ── getSeed ──────────────────────────────────────────────────────────────────────

describe("OsEnvatoSeedService — getSeed", () => {
  it("returns the seed", async () => {
    const db = makeDb(() => [row()]);
    const svc = new OsEnvatoSeedService(db, metadataPath);
    expect((await svc.getSeed("dental-001")).id).toBe("dental-001");
  });

  it("throws NOT_FOUND when absent", async () => {
    const svc = new OsEnvatoSeedService(NO_DATA, metadataPath);
    await expect(svc.getSeed("nope")).rejects.toThrow(OsEnvatoSeedError);
  });
});

// ── getSectorStats ───────────────────────────────────────────────────────────────

describe("OsEnvatoSeedService — getSectorStats", () => {
  it("parses aggregate counts", async () => {
    const db = makeDb(() => [
      { sector: "dental", total: "50", downloaded: "5", metadata_only: "45", failed: "0" },
      { sector: "legal", total: "50", downloaded: "0", metadata_only: "50", failed: "0" },
    ]);
    const svc = new OsEnvatoSeedService(db, metadataPath);
    const stats = await svc.getSectorStats();
    expect(stats).toHaveLength(2);
    expect(stats[0]!.downloaded).toBe(5);
    expect(stats[1]!.total).toBe(50);
  });
});

// ── markDownloaded / markFailed ──────────────────────────────────────────────────

describe("OsEnvatoSeedService — mark*", () => {
  it("markDownloaded sets status + zip + envato source", async () => {
    const db = makeDb(() => [row({ download_status: "downloaded", zip_path: "/z/x.zip", source: "envato", envato_id: "e1" })]);
    const svc = new OsEnvatoSeedService(db, metadataPath);
    const seed = await svc.markDownloaded("dental-001", "/z/x.zip", "e1");
    expect(seed.downloadStatus).toBe("downloaded");
    expect(seed.zipPath).toBe("/z/x.zip");
    expect(seed.source).toBe("envato");
  });

  it("markDownloaded throws NOT_FOUND when missing", async () => {
    const svc = new OsEnvatoSeedService(NO_DATA, metadataPath);
    await expect(svc.markDownloaded("nope", "/z")).rejects.toThrow(OsEnvatoSeedError);
  });

  it("markFailed sets status=failed", async () => {
    const db = makeDb(() => [row({ download_status: "failed" })]);
    const svc = new OsEnvatoSeedService(db, metadataPath);
    expect((await svc.markFailed("dental-001", "boom")).downloadStatus).toBe("failed");
  });
});
