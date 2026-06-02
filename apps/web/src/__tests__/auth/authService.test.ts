import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";

import { AuthService, type AuthDbPort } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

const secret = process.env.JWT_SECRET as string;

describe("AuthService", () => {
  it(
    "register hashes password, inserts via DB, returns token",
    async () => {
    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT")) {
        expect(params?.[1]).not.toBe("password12");
        expect(typeof params?.[1]).toBe("string");
        expect(await bcrypt.compare("password12", String(params?.[1]))).toBe(true);
        return [
          {
            user_id: "uid-1",
            email: "test@example.com",
            password_hash: String(params?.[1]),
            full_name: "Test User",
            plan: "free",
            tenant_id: "ten-1",
          },
        ];
      }
      return [];
    });
    const svc = new AuthService(secret, { query: query as AuthDbPort["query"] });
    const r = await svc.register("test@example.com", "password12", "Test User");
    expect(r.userId).toBe("uid-1");
    expect(r.email).toBe("test@example.com");
    expect(r.tenantId).toBe("ten-1");
    expect(r.token.length).toBeGreaterThan(20);
    expect(typeof r.expiresAt).toBe("string");
    const claims = await svc.verifyToken(r.token);
    expect(claims).toEqual({ userId: "uid-1", email: "test@example.com", tenantId: "ten-1", plan: "free" });
    },
    30_000,
  );

  it(
    "login with correct password returns verifiable token",
    async () => {
    const hash = await bcrypt.hash("rightpass12", 4);
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT")) {
        return [
          {
            user_id: "u",
            email: "a@b.com",
            password_hash: hash,
            full_name: "A",
            plan: "pro",
            tenant_id: "t",
          },
        ];
      }
      return [];
    });
    const svc = new AuthService(secret, { query: query as AuthDbPort["query"] });
    const r = await svc.login("a@b.com", "rightpass12");
    await expect(svc.verifyToken(r.token)).resolves.toEqual({ userId: "u", email: "a@b.com", tenantId: "t", plan: "pro" });
    },
    30_000,
  );

  it("login with wrong password throws", async () => {
    const hash = await bcrypt.hash("rightpass12", 4);
    const query = vi.fn(async () => [
      { user_id: "u", email: "a@b.com", password_hash: hash, full_name: "A", plan: "free", tenant_id: "t" },
    ]);
    const svc = new AuthService(secret, { query: query as AuthDbPort["query"] });
    await expect(svc.login("a@b.com", "wrongpassword")).rejects.toThrow(OsAgentError);
  });

  it("register rejects name shorter than 2 characters", async () => {
    const svc = new AuthService(secret, { query: async () => [] });
    await expect(svc.register("test@example.com", "password12", "A")).rejects.toMatchObject({
      message: "Name must be at least 2 characters",
      name: "OsAgentError",
    });
  });

  it("login when email does not exist throws", async () => {
    const query = vi.fn(async () => []);
    const svc = new AuthService(secret, { query: query as AuthDbPort["query"] });
    await expect(svc.login("missing@b.com", "anypass123")).rejects.toThrow(OsAgentError);
  });

  it("verifyToken with valid token returns payload", async () => {
    const token = jwt.sign(
      { userId: "1", email: "e@e.com", tenantId: "t", plan: "free" },
      secret,
      { expiresIn: "1h", algorithm: "HS256" },
    );
    const svc = new AuthService(secret, { query: async () => [] });
    await expect(svc.verifyToken(token)).resolves.toEqual({ userId: "1", email: "e@e.com", tenantId: "t", plan: "free" });
  });

  it("verifyToken with expired token throws Unauthorized", async () => {
    const token = jwt.sign(
      { userId: "1", email: "e@e.com", tenantId: "t", plan: "free" },
      secret,
      { expiresIn: "-30s", algorithm: "HS256" },
    );
    const svc = new AuthService(secret, { query: async () => [] });
    await expect(svc.verifyToken(token)).rejects.toMatchObject({ message: "Unauthorized", name: "OsAgentError" });
  });
});
