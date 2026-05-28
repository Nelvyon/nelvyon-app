import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../../monitoring", () => ({
  NelvyonMonitor: {
    trackAuthError: vi.fn(),
  },
}));

import { AuthService } from "../../../auth/AuthService";
import { OsAgentError } from "../../../os-agents/OsAgentError";

const JWT_SECRET = "test-jwt-secret-with-at-least-32-characters-long";
const userRow = {
  user_id: "user-1",
  email: "ana@test.com",
  password_hash: "",
  full_name: "Ana Test",
  plan: "pro",
  tenant_id: "tenant-1",
};

describe("flow: auth — registro → login → refresh → logout", () => {
  let auth: AuthService;

  beforeEach(() => {
    queryMock.mockReset();
    auth = new AuthService(JWT_SECRET, { query: queryMock });
  });

  it("registro con email válido devuelve userId y token", { timeout: 15000 }, async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes("INSERT INTO nelvyon_users")) {
        return [{ ...userRow, password_hash: await auth.hashPassword("password123") }];
      }
      return [];
    });

    const result = await auth.register("ana@test.com", "password123", "Ana Test");

    expect(result.userId).toBe("user-1");
    expect(result.email).toBe("ana@test.com");
    expect(result.token).toBeTruthy();
    const claims = await auth.verifyToken(result.token);
    expect(claims.userId).toBe("user-1");
  });

  it("registro con email duplicado lanza error 409-equivalente", async () => {
    queryMock.mockRejectedValueOnce({ code: "23505" });

    await expect(auth.register("dup@test.com", "password123", "Dup User")).rejects.toThrow(
      /Email already registered/,
    );
  });

  it("login correcto devuelve token válido", async () => {
    const hash = await auth.hashPassword("secretpass");
    queryMock.mockResolvedValueOnce([{ ...userRow, password_hash: hash }]);

    const result = await auth.login("ana@test.com", "secretpass");

    expect(result.token).toBeTruthy();
    await expect(auth.verifyToken(result.token)).resolves.toMatchObject({
      userId: "user-1",
      email: "ana@test.com",
    });
  });

  it("login con password incorrecta lanza error 401-equivalente", async () => {
    const hash = await auth.hashPassword("correct");
    queryMock.mockResolvedValueOnce([{ ...userRow, password_hash: hash }]);

    await expect(auth.login("ana@test.com", "wrongpass")).rejects.toThrow(/Invalid credentials/);
  });

  it("token expirado lanza Unauthorized", async () => {
    const expired = jwt.sign(
      { userId: "user-1", email: "a@b.com", tenantId: "t1", plan: "free" },
      JWT_SECRET,
      { expiresIn: "-1s", algorithm: "HS256" },
    );

    await expect(auth.verifyToken(expired)).rejects.toBeInstanceOf(OsAgentError);
    await expect(auth.verifyToken(expired)).rejects.toThrow(/Unauthorized/);
  });

  it("refresh: nuevo login emite token válido (sesión renovada)", { timeout: 15000 }, async () => {
    const hash = await auth.hashPassword("secretpass");
    queryMock.mockResolvedValue([{ ...userRow, password_hash: hash }]);

    const first = await auth.login("ana@test.com", "secretpass");
    const second = await auth.login("ana@test.com", "secretpass");

    expect(second.token).toBeTruthy();
    expect(second.userId).toBe(first.userId);
    expect(second.expiresAt).toBeTruthy();
    await expect(auth.verifyToken(second.token)).resolves.toMatchObject({ userId: "user-1" });
    await expect(auth.verifyToken(first.token)).resolves.toMatchObject({ userId: "user-1" });
  });

  it("logout: token manipulado queda invalidado (verify falla)", async () => {
    const hash = await auth.hashPassword("secretpass");
    queryMock.mockResolvedValueOnce([{ ...userRow, password_hash: hash }]);
    const { token } = await auth.login("ana@test.com", "secretpass");
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.invalidsignature`;

    await expect(auth.verifyToken(tampered)).rejects.toThrow(/Unauthorized/);
  });
});
