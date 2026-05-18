import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("../../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { decrypt, encrypt, OAuthService } from "../../../oauth/OAuthService";
import { GoogleOAuthProvider } from "../../../oauth/GoogleOAuthProvider";

describe("flow: OAuth — Google → cifrado → refresh → desconexión", () => {
  beforeAll(() => {
    process.env.OAUTH_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    process.env.GOOGLE_CLIENT_ID = "gid";
    process.env.GOOGLE_CLIENT_SECRET = "gsecret";
  });

  beforeEach(() => {
    OAuthService.reset();
    queryMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("saveConnection guarda token cifrado (no texto plano)", async () => {
    queryMock.mockResolvedValueOnce([]);
    await OAuthService.instance().saveConnection("user-1", "google", {
      accessToken: "plain-access",
      refreshToken: "plain-refresh",
      scopes: ["openid"],
    });
    const [, args] = queryMock.mock.calls[0]!;
    expect(args[2]).not.toBe("plain-access");
    expect(args[3]).not.toBe("plain-refresh");
  });

  it("getConnection devuelve token descifrado", async () => {
    const encAccess = encrypt("plain-access");
    const encRefresh = encrypt("plain-refresh");
    queryMock.mockResolvedValueOnce([
      {
        id: "c1",
        user_id: "user-1",
        provider: "google",
        scopes: ["openid"],
        access_token: encAccess,
        refresh_token: encRefresh,
        token_expires_at: "2026-06-01T00:00:00.000Z",
        external_account_id: "a@b.com",
        external_account_name: "Test",
        is_active: true,
        created_at: "2026-05-16T00:00:00.000Z",
        updated_at: "2026-05-16T00:00:00.000Z",
      },
    ]);
    const conn = await OAuthService.instance().getConnection("user-1", "google");
    expect(conn?.accessToken).toBe("plain-access");
  });

  it("token expirado: refresh automático vía GoogleOAuthProvider", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "new-access", expires_in: 3600 }),
    });

    const refreshed = await new GoogleOAuthProvider().refreshAccessToken("refresh-tok");
    expect(refreshed.accessToken).toBe("new-access");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("refresh falla: error propagado", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(new GoogleOAuthProvider().refreshAccessToken("bad")).rejects.toThrow(/refresh failed/);
  });

  it("deleteConnection desactiva is_active", async () => {
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
    expect(String(queryMock.mock.calls[0]![0])).not.toContain("access_token");
  });

  it("encrypt/decrypt round-trip íntegro", () => {
    expect(decrypt(encrypt("secret-token"))).toBe("secret-token");
  });
});
