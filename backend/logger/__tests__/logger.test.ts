import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { createLogger, createRequestLogger, logger, sanitizeMeta } from "../index";

describe("sanitizeMeta", () => {
  it("removes forbidden keys at top level", () => {
    const out = sanitizeMeta({
      password: "secret",
      token: "tok",
      ok: true,
    });
    expect(out).toEqual({ ok: true });
    expect(out.password).toBeUndefined();
    expect(out.token).toBeUndefined();
  });

  it("removes forbidden keys in nested objects", () => {
    const out = sanitizeMeta({
      nested: { authorization: "Bearer x", keep: 1 },
    });
    expect(out).toEqual({ nested: { keep: 1 } });
  });
});

describe("logger production JSON", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "info");
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(Sentry.captureException).mockClear();
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("logger.info emits one JSON line with level, timestamp, message", () => {
    logger.info("test_msg", { foo: "bar" });
    expect(logSpy).toHaveBeenCalledOnce();
    const line = logSpy.mock.calls[0][0] as string;
    expect(line).not.toContain("\n");
    const obj = JSON.parse(line) as Record<string, unknown>;
    expect(obj.level).toBe("info");
    expect(obj.message).toBe("test_msg");
    expect(obj.timestamp).toEqual(expect.any(String));
    expect(obj.foo).toBe("bar");
  });

  it("logger.debug is silenced in production with LOG_LEVEL=info", () => {
    const scoped = createLogger("ctx");
    scoped.debug("silent_debug");
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("createRequestLogger injects requestId into each log line", () => {
    const reqLog = createRequestLogger("req-abc", "user-9");
    reqLog.info("hi", { x: 1 });
    const line = logSpy.mock.calls[0][0] as string;
    const obj = JSON.parse(line) as Record<string, unknown>;
    expect(obj.requestId).toBe("req-abc");
    expect(obj.userId).toBe("user-9");
    expect(obj.message).toBe("hi");
  });

  it("does not emit password or token keys in JSON output", () => {
    logger.info("login", { password: "hunter2", token: "abc", user: "u1" });
    const line = logSpy.mock.calls[0][0] as string;
    expect(line).not.toMatch(/"password"\s*:/);
    expect(line).not.toMatch(/"token"\s*:/);
    const obj = JSON.parse(line) as Record<string, unknown>;
    expect(obj.user).toBe("u1");
  });

  it("logger.error with Error as third argument calls Sentry.captureException", () => {
    const err = new Error("fail");
    logger.error("boom", { code: "E1" }, err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
    const line = logSpy.mock.calls[0][0] as string;
    expect(line).not.toContain('"stack"');
  });

  it("logger.error with Error in meta calls Sentry", () => {
    const err = new Error("nested");
    logger.error("boom", { error: err });
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });
});
