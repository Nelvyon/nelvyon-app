import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SHARED_MEMORY_CONTRACT_VERSION,
  DefaultSharedMemoryPolicy,
  InMemorySharedMemoryStore,
  SharedMemoryNotEnabledError,
  assertSharedMemoryNotEnabledInPrep,
  getSharedMemoryConfig,
  getSharedMemoryStore,
  resetInMemorySharedMemoryStoreForTests,
  resetSharedMemoryStoreSingletonForTests,
  setSharedMemoryStoreForTests,
} from "../../shared-memory";
import {
  SaasSharedMemoryService,
  resetSaasSharedMemoryServiceForTests,
} from "../SaasSharedMemoryService";

describe("Shared Memory contracts (default OFF)", () => {
  afterEach(() => {
    delete process.env.NELVYON_SHARED_MEMORY_ENABLED;
    resetSharedMemoryStoreSingletonForTests();
    resetInMemorySharedMemoryStoreForTests();
    resetSaasSharedMemoryServiceForTests();
    setSharedMemoryStoreForTests(null);
  });

  it("keeps feature flag OFF by default", () => {
    expect(assertSharedMemoryNotEnabledInPrep().ok).toBe(true);
    expect(getSharedMemoryConfig().enabled).toBe(false);
  });

  it("exposes contract version 1.1.0", () => {
    expect(SHARED_MEMORY_CONTRACT_VERSION).toBe("1.1.0");
  });

  it("store throws NotEnabled when flag OFF", async () => {
    const store = getSharedMemoryStore();
    await expect(
      store.write({
        tenantId: "t1",
        scope: "tenant",
        visibility: "private",
        kind: "fact",
        key: "k",
        content: "c",
        createdBy: "u1",
      }),
    ).rejects.toBeInstanceOf(SharedMemoryNotEnabledError);
  });

  it("policy denies cross-tenant write", () => {
    const p = new DefaultSharedMemoryPolicy();
    const d = p.authorizeWrite(
      { tenantId: "t1", userId: "u", agentId: "ceo", roles: ["owner"], scopes: ["memory.write"] },
      {
        tenantId: "t2",
        scope: "tenant",
        visibility: "private",
        kind: "fact",
        key: "k",
        content: "x",
        createdBy: "u",
      },
    );
    expect(d).toBe("denied");
  });

  it("policy requires approval for tenant_shared from non-admin", () => {
    const p = new DefaultSharedMemoryPolicy();
    const d = p.authorizeWrite(
      { tenantId: "t1", userId: "u", agentId: "seo", roles: ["member"], scopes: ["memory.write"] },
      {
        tenantId: "t1",
        scope: "shared_team",
        visibility: "tenant_shared",
        kind: "decision",
        key: "d1",
        content: "decision",
        createdBy: "u",
      },
    );
    expect(d).toBe("approval_required");
  });
});

describe("Shared Memory runtime (InMemory)", () => {
  let store: InMemorySharedMemoryStore;
  let svc: SaasSharedMemoryService;

  beforeEach(() => {
    process.env.NELVYON_SHARED_MEMORY_ENABLED = "1";
    process.env.NELVYON_SHARED_MEMORY_BACKEND = "memory";
    resetInMemorySharedMemoryStoreForTests();
    resetSharedMemoryStoreSingletonForTests();
    resetSaasSharedMemoryServiceForTests();
    store = new InMemorySharedMemoryStore();
    setSharedMemoryStoreForTests(store);
    svc = new SaasSharedMemoryService(store);
  });

  afterEach(() => {
    delete process.env.NELVYON_SHARED_MEMORY_ENABLED;
    delete process.env.NELVYON_SHARED_MEMORY_BACKEND;
    setSharedMemoryStoreForTests(null);
    resetInMemorySharedMemoryStoreForTests();
    resetSharedMemoryStoreSingletonForTests();
    resetSaasSharedMemoryServiceForTests();
  });

  const ctx = {
    tenantId: "00000000-0000-0000-0000-0000000000aa",
    userId: "user-1",
    agentId: "ceo_supervisor",
    roles: ["owner"],
    scopes: ["memory.write", "memory.read"],
  };

  it("writes and reads with tenant isolation", async () => {
    const entry = await svc.write(ctx, {
      tenantId: ctx.tenantId,
      scope: "tenant",
      visibility: "tenant_shared",
      kind: "fact",
      key: "brand.voice",
      content: "Tono profesional en español",
      createdBy: ctx.userId,
    });
    expect(entry.id).toBeTruthy();
    expect(entry.layer).toBe("ltm");

    const got = await svc.read(ctx, entry.id);
    expect(got?.content).toContain("profesional");

    const other = {
      ...ctx,
      tenantId: "00000000-0000-0000-0000-0000000000bb",
    };
    await expect(svc.read(other, entry.id)).resolves.toBeNull();
  });

  it("upserts by composite key", async () => {
    await svc.write(ctx, {
      tenantId: ctx.tenantId,
      scope: "agent",
      visibility: "private",
      kind: "preference",
      agentId: "seo",
      key: "style",
      content: "Preferencia estilo SEO v1 — títulos claros",
      createdBy: ctx.userId,
    });
    const v2 = await svc.write(ctx, {
      tenantId: ctx.tenantId,
      scope: "agent",
      visibility: "private",
      kind: "preference",
      agentId: "seo",
      key: "style",
      content: "Preferencia estilo SEO v2 — tono directo B2B",
      createdBy: ctx.userId,
    });
    expect(v2.version).toBe(2);
    expect(v2.content).toContain("v2");
    const listed = await svc.listByAgent(ctx, "seo", 10);
    expect(listed).toHaveLength(1);
  });

  it("defaults session/user scopes to STM with TTL", async () => {
    const entry = await svc.write(ctx, {
      tenantId: ctx.tenantId,
      scope: "session",
      visibility: "private",
      kind: "conversation_summary",
      sessionId: "s1",
      key: "last",
      content: "hablamos de pricing",
      createdBy: ctx.userId,
    });
    expect(entry.layer).toBe("stm");
    expect(entry.expiresAt).toBeTruthy();
  });

  it("searches by query text and never leaks other tenants", async () => {
    await svc.write(ctx, {
      tenantId: ctx.tenantId,
      scope: "tenant",
      visibility: "tenant_shared",
      kind: "fact",
      key: "a",
      content: "Nelvyon CRM pipeline",
      createdBy: ctx.userId,
    });
    const otherStore = new InMemorySharedMemoryStore();
    await otherStore.write({
      tenantId: "00000000-0000-0000-0000-0000000000bb",
      scope: "tenant",
      visibility: "tenant_shared",
      kind: "fact",
      key: "a",
      content: "secret other tenant CRM",
      createdBy: "x",
    });
    // search only via svc bound to ctx.tenantId
    const res = await svc.search(ctx, { query: "CRM", limit: 10 });
    expect(res.entries.every((e) => e.tenantId === ctx.tenantId)).toBe(true);
    expect(res.entries.some((e) => e.content.includes("secret other"))).toBe(false);
  });

  it("blocks private agent memory from other agents", async () => {
    const entry = await svc.write(ctx, {
      tenantId: ctx.tenantId,
      scope: "agent",
      visibility: "private",
      kind: "fact",
      agentId: "seo",
      key: "notes",
      content: "solo SEO",
      createdBy: ctx.userId,
    });
    const salesCtx = { ...ctx, agentId: "sales", roles: ["member"], scopes: ["memory.read"] };
    await expect(svc.read(salesCtx, entry.id)).rejects.toMatchObject({ name: "SharedMemoryDeniedError" });
    // owner may audit private agent entries
    const ownerRead = await svc.read({ ...ctx, agentId: "ceo_supervisor", roles: ["owner"] }, entry.id);
    expect(ownerRead?.content).toBe("solo SEO");
  });
});
