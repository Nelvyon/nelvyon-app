// @ts-nocheck
import { describe, expect, it } from "vitest";

import { AppError, ERROR_MAP, toClientError } from "../../errors";

describe("appErrors", () => {
  it("AppError tiene el payload correcto", () => {
    const err = new AppError("RATE_LIMIT_EXCEEDED");
    expect(err.payload.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(err.payload.statusCode).toBe(429);
    expect(err.payload.actionUrl).toBe("/pricing");
  });

  it("AppError acepta mensaje personalizado", () => {
    const err = new AppError("AGENT_FAILED", "Timeout en el modelo");
    expect(err.message).toBe("Timeout en el modelo");
    expect(err.payload.message).toBe("Timeout en el modelo");
    expect(err.payload.statusCode).toBe(500);
  });

  it("toClientError mapea RateLimitExceededError", () => {
    const raw = new Error("Rate limit exceeded");
    raw.name = "RateLimitExceededError";
    const payload = toClientError(raw);
    expect(payload.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("toClientError devuelve UNKNOWN_ERROR para errores desconocidos", () => {
    const payload = toClientError(new Error("algo raro"));
    expect(payload.code).toBe("UNKNOWN_ERROR");
    expect(payload.statusCode).toBe(500);
  });

  it("ERROR_MAP cubre todos los códigos", () => {
    const codes = Object.keys(ERROR_MAP);
    expect(codes.length).toBeGreaterThan(0);
    codes.forEach((code) => {
      expect(ERROR_MAP[code].statusCode).toBeGreaterThanOrEqual(200);
    });
  });
});
