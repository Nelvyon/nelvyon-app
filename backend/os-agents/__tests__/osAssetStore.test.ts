import { describe, expect, it, vi } from "vitest";

import { OsAssetStore, osAssetStore, type OsAsset, type AssetType } from "../assets/OsAssetStore";

const row = (over: Partial<OsAsset> = {}): OsAsset => ({
  id: "00000000-0000-0000-0000-000000000001",
  clientId: "c1",
  tenantId: "t1",
  jobId: "job-1",
  serviceId: "web_premium",
  type: "image",
  name: "hero.png",
  url: "https://example.com/a.png",
  sizeBytes: 100,
  mimeType: "image/png",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("OsAssetStore", () => {
  it("saveAsset guarda activo y devuelve el objeto completo con id", async () => {
    const saved = row({ id: "new-uuid" });
    const query = vi.fn().mockResolvedValue([saved]);
    const store = new OsAssetStore({ db: { query } });
    const out = await store.saveAsset({
      clientId: "c1",
      tenantId: "t1",
      jobId: "job-1",
      serviceId: "web_premium",
      type: "image",
      name: "hero.png",
      url: "https://example.com/a.png",
      sizeBytes: 100,
      mimeType: "image/png",
    });
    expect(out.id).toBe("new-uuid");
    expect(out.clientId).toBe("c1");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_assets"), expect.any(Array));
  });

  it("saveAsset lanza si INSERT no devuelve fila", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const store = new OsAssetStore({ db: { query } });
    await expect(
      store.saveAsset({
        clientId: "c1",
        tenantId: "t1",
        type: "pdf",
        name: "x.pdf",
        url: "https://x/x.pdf",
      }),
    ).rejects.toThrow("no row");
  });

  it("getClientAssets devuelve todos los activos del cliente", async () => {
    const list = [row({ id: "a" }), row({ id: "b", name: "b.png" })];
    const query = vi.fn().mockResolvedValue(list);
    const store = new OsAssetStore({ db: { query } });
    const out = await store.getClientAssets("c1", "t1");
    expect(out).toEqual(list);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE client_id = $1 AND tenant_id = $2"), ["c1", "t1"]);
    expect(String(query.mock.calls[0]?.[0])).not.toContain("AND type =");
  });

  it("getClientAssets filtrado por type devuelve solo ese tipo", async () => {
    const query = vi.fn().mockResolvedValue([row({ type: "video" as AssetType })]);
    const store = new OsAssetStore({ db: { query } });
    await store.getClientAssets("c1", "t1", "video");
    expect(String(query.mock.calls[0]?.[0])).toContain("AND type = $3");
    expect(query.mock.calls[0]?.[1]).toEqual(["c1", "t1", "video"]);
  });

  it("getClientAssets usa ORDER BY created_at DESC", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const store = new OsAssetStore({ db: { query } });
    await store.getClientAssets("c1", "t1");
    expect(String(query.mock.calls[0]?.[0])).toContain("ORDER BY created_at DESC");
  });

  it("getAssetById devuelve el activo correcto", async () => {
    const a = row();
    const query = vi.fn().mockResolvedValue([a]);
    const store = new OsAssetStore({ db: { query } });
    const out = await store.getAssetById(a.id, "c1");
    expect(out).toEqual(a);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("id = $1::uuid"), [a.id, "c1"]);
  });

  it("getAssetById con id de otro cliente devuelve null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const store = new OsAssetStore({ db: { query } });
    expect(await store.getAssetById("00000000-0000-0000-0000-000000000099", "otro")).toBeNull();
  });

  it("deleteAsset elimina el activo y devuelve true", async () => {
    const query = vi.fn().mockResolvedValue([{ id: "x" }]);
    const store = new OsAssetStore({ db: { query } });
    expect(await store.deleteAsset("00000000-0000-0000-0000-000000000001", "c1")).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM os_assets"), expect.any(Array));
  });

  it("deleteAsset con id inexistente devuelve false", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const store = new OsAssetStore({ db: { query } });
    expect(await store.deleteAsset("00000000-0000-0000-0000-000000000099", "c1")).toBe(false);
  });

  it("getClientAssets de otro cliente usa parámetros distintos (no mezcla datos)", async () => {
    const query = vi.fn().mockImplementation(async (_sql: string, params?: unknown[]) => {
      if (params?.[0] === "alice" && params[1] === "t1") return [row({ clientId: "alice", name: "a.png" })];
      return [];
    });
    const store = new OsAssetStore({ db: { query } });
    const aliceAssets = await store.getClientAssets("alice", "t1");
    const bobAssets = await store.getClientAssets("bob", "t1");
    expect(aliceAssets).toHaveLength(1);
    expect(bobAssets).toHaveLength(0);
  });

  it("osAssetStore singleton es instancia de OsAssetStore", () => {
    expect(osAssetStore).toBeInstanceOf(OsAssetStore);
  });

  it("saveAsset permite job y service opcionales (null en SQL)", async () => {
    const saved = row({ jobId: undefined, serviceId: undefined });
    const query = vi.fn().mockResolvedValue([saved]);
    const store = new OsAssetStore({ db: { query } });
    await store.saveAsset({
      clientId: "c1",
      tenantId: "t1",
      type: "document",
      name: "readme.txt",
      url: "https://x/x.txt",
    });
    const params = query.mock.calls[0]?.[1] as unknown[];
    expect(params?.[2]).toBeNull();
    expect(params?.[3]).toBeNull();
  });

  it("getAssetById filtra por client_id", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const store = new OsAssetStore({ db: { query } });
    await store.getAssetById("00000000-0000-0000-0000-000000000001", "solo-yo");
    expect(String(query.mock.calls[0]?.[0])).toContain("client_id = $2");
    expect(query.mock.calls[0]?.[1]).toEqual(["00000000-0000-0000-0000-000000000001", "solo-yo"]);
  });
});
