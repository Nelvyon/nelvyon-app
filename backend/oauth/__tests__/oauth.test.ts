import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { decrypt, encrypt, OAuthService } from "../OAuthService";

const connectionRow = {
  id: "c1",
  user_id: "user-1",
  provider: "google" as const,
  scopes: ["openid"],
  access_token: "",
  refresh_token: "enc-refresh",
  token_expires_at: "2026-06-01T00:00:00.000Z",
  external_account_id: "user@example.com",
  external_account_name: "Test User",
  is_active: true,
  created_at: "2026-05-16T00:00:00.000Z",
  updated_at: "2026-05-16T00:00:00.000Z",
};

describe("OAuthService", () => {
  beforeAll(() => {
    process.env.OAUTH_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  });

  beforeEach(() => {
    OAuthService.reset();
    queryMock.mockReset();
  });

  it("encrypt/decrypt round-trip", () => {
    const plain = "secret-access-token-value";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("saveConnection inserta tokens cifrados", async () => {
    queryMock.mockResolvedValueOnce([]);
    await OAuthService.instance().saveConnection("user-1", "google", {
      accessToken: "plain-access",
      refreshToken: "plain-refresh",
      scopes: ["openid"],
    });
    const [, args] = queryMock.mock.calls[0]!;
    const encAccess = args[2] as string;
    const encRefresh = args[3] as string;
    expect(encAccess).not.toBe("plain-access");
    expect(encRefresh).not.toBe("plain-refresh");
    expect(encAccess).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i);
    expect(String(queryMock.mock.calls[0]![0])).toContain("ON CONFLICT");
  });

  it("getConnection devuelve tokens descifrados", async () => {
    const encAccess = encrypt("plain-access");
    const encRefresh = encrypt("plain-refresh");
    queryMock.mockResolvedValueOnce([
      { ...connectionRow, access_token: encAccess, refresh_token: encRefresh },
    ]);
    const conn = await OAuthService.instance().getConnection("user-1", "google");
    expect(conn?.accessToken).toBe("plain-access");
    expect(conn?.refreshToken).toBe("plain-refresh");
  });

  it("deleteConnection desactiva conexión", async () => {
    queryMock.mockResolvedValueOnce([]);
    await OAuthService.instance().deleteConnection("user-1", "google");
    expect(String(queryMock.mock.calls[0]![0])).toContain("is_active = false");
  });

  it("listConnections no incluye tokens", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: "c1",
        provider: "google",
        external_account_name: "Test",
        external_account_id: "a@b.com",
        scopes: ["openid"],
        is_active: true,
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
      },
    ]);
    const list = await OAuthService.instance().listConnections("user-1");
    expect(list[0]).not.toHaveProperty("accessToken");
    expect(list[0]).not.toHaveProperty("refreshToken");
    expect(list[0]?.provider).toBe("google");
    const sql = String(queryMock.mock.calls[0]![0]);
    expect(sql).not.toContain("access_token");
  });
});
