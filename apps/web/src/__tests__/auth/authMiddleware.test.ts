import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authenticate, extractToken } from "@nelvyon/auth";
import * as AuthServiceModule from "../../../../../backend/auth/AuthService";
const secret = process.env.JWT_SECRET as string;

describe("extractToken", () => {
  it("returns token from Authorization Bearer header", () => {
    const req = new Request("https://example.test/api", { headers: { Authorization: "Bearer my.jwt.token" } });
    expect(extractToken(req)).toBe("my.jwt.token");
  });

  it("returns token from nelvyon_token cookie", () => {
    const req = new Request("https://example.test/api", {
      headers: { cookie: "other=1; nelvyon_token=aa.bb.cc; x=2" },
    });
    expect(extractToken(req)).toBe("aa.bb.cc");
  });
});

describe("authenticate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("authenticates when Bearer token verifies", async () => {
    const payload = { userId: "u1", email: "e@test.com", tenantId: "t1", plan: "free" };
    const token = jwt.sign(payload, secret, { expiresIn: "1h", algorithm: "HS256" });
    const real = new AuthServiceModule.AuthService(secret, { query: async () => [] });
    vi.spyOn(AuthServiceModule, "getAuthService").mockReturnValue(real);
    const req = new Request("https://example.test", { headers: { Authorization: `Bearer ${token}` } });
    await expect(authenticate(req)).resolves.toEqual(payload);
  });

  it("authenticates when token only in cookie", async () => {
    const payload = { userId: "u2", email: "e2@test.com", tenantId: "t2", plan: "starter" };
    const token = jwt.sign(payload, secret, { expiresIn: "1h", algorithm: "HS256" });
    const real = new AuthServiceModule.AuthService(secret, { query: async () => [] });
    vi.spyOn(AuthServiceModule, "getAuthService").mockReturnValue(real);
    const req = new Request("https://example.test", { headers: { cookie: `nelvyon_token=${token}` } });
    await expect(authenticate(req)).resolves.toEqual(payload);
  });

  it("throws Unauthorized when no token", async () => {
    const spy = vi.spyOn(AuthServiceModule, "getAuthService");
    const req = new Request("https://example.test");
    await expect(authenticate(req)).rejects.toMatchObject({ message: "Unauthorized", name: "OsAgentError" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("throws Unauthorized when token invalid", async () => {
    const real = new AuthServiceModule.AuthService(secret, { query: async () => [] });
    vi.spyOn(AuthServiceModule, "getAuthService").mockReturnValue(real);
    const req = new Request("https://example.test", { headers: { Authorization: "Bearer not-a-jwt" } });
    await expect(authenticate(req)).rejects.toMatchObject({ message: "Unauthorized" });
  });
});
