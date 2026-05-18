import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

import { getApiKey, getEffectiveApiKey, listUserProviders, saveApiKey } from "../../apikeys";

describe("apiKeys", () => {
  beforeEach(() => {
    queryMock.mockReset();
    process.env.API_KEYS_ENCRYPTION_SECRET = "test-secret-32-chars-padding-ok!";
  });

  it("saveApiKey llama INSERT con key cifrada", async () => {
    queryMock.mockResolvedValue([]);
    await saveApiKey("user-1", "openai", "sk-test-key");
    expect(queryMock).toHaveBeenCalledTimes(1);
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain("INSERT INTO api_keys");
    const params = queryMock.mock.calls[0][1] as unknown[];
    expect(params[2]).not.toBe("sk-test-key");
  });

  it("getApiKey devuelve null cuando no hay fila", async () => {
    queryMock.mockResolvedValue([]);
    const result = await getApiKey("user-1", "openai");
    expect(result).toBeNull();
  });

  it("getEffectiveApiKey usa fallback de env si no hay key de usuario", async () => {
    queryMock.mockResolvedValue([]);
    process.env.OPENAI_API_KEY = "sk-nelvyon-fallback";
    const key = await getEffectiveApiKey("user-1", "openai");
    expect(key).toBe("sk-nelvyon-fallback");
  });

  it("listUserProviders devuelve providers correctos", async () => {
    queryMock.mockResolvedValue([{ provider: "openai" }, { provider: "elevenlabs" }]);
    const providers = await listUserProviders("user-1");
    expect(providers).toEqual(["openai", "elevenlabs"]);
  });
});
