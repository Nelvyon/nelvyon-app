import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { SECURITY_HEADERS_WITHOUT_CSP } from "../../../../apps/web/src/lib/security/headers";
import { toClientError } from "../../../errors/appErrors";
import { createRequestLogger, sanitizeMeta } from "../../../logger";
import { AuthService } from "../../../auth/AuthService";
import { OsAgentError } from "../../../os-agents/OsAgentError";
import { RateLimitExceededError } from "../../../usage/rateLimiter";

describe("flow: seguridad — rate limit → headers → correlation → logs", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "info");
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("correlation ID presente en logs vía createRequestLogger", () => {
    const reqLog = createRequestLogger("corr-flow-123", "user-9");
    reqLog.info("request_handled", { path: "/api/test" });
    const line = logSpy.mock.calls[0]![0] as string;
    const obj = JSON.parse(line) as Record<string, unknown>;
    expect(obj.requestId).toBe("corr-flow-123");
    expect(obj.userId).toBe("user-9");
  });

  it("sanitizeMeta elimina password/token/secret de logs", () => {
    const out = sanitizeMeta({
      password: "hunter2",
      token: "abc",
      secret: "xyz",
      authorization: "Bearer x",
      ok: true,
    });
    expect(out).toEqual({ ok: true });
    expect(out.password).toBeUndefined();
    expect(out.token).toBeUndefined();
  });

  it("rate limit → 429 vía toClientError", () => {
    const payload = toClientError(new RateLimitExceededError("starter", 500));
    expect(payload.statusCode).toBe(429);
    expect(payload.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("headers de seguridad incluyen X-Frame-Options y X-Content-Type-Options", () => {
    const keys = SECURITY_HEADERS_WITHOUT_CSP.map((h) => h.key);
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    const frame = SECURITY_HEADERS_WITHOUT_CSP.find((h) => h.key === "X-Frame-Options");
    expect(frame?.value).toBe("SAMEORIGIN");
  });

  it("JWT expirado → 401 (no 500) vía toClientError", async () => {
    const secret = "test-jwt-secret-with-at-least-32-characters-long";
    const auth = new AuthService(secret, { query: vi.fn() });
    const expired = jwt.sign(
      { userId: "u1", email: "a@b.com", tenantId: "t1", plan: "free" },
      secret,
      { expiresIn: "-1s", algorithm: "HS256" },
    );

    try {
      await auth.verifyToken(expired);
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(OsAgentError);
      const payload = toClientError(err);
      expect(payload.statusCode).toBe(401);
      expect(payload.code).toBe("UNAUTHORIZED");
    }
  });
});
