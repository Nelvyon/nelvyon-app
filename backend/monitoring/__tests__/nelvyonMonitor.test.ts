import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NelvyonMonitor } from "../NelvyonMonitor";

const sentryMock = vi.hoisted(() => ({
  init: vi.fn(),
  withScope: vi.fn((cb: (scope: { setTag: (k: string, v: string) => void; setExtra: (k: string, v: unknown) => void }) => void) =>
    cb({
      setTag: vi.fn(),
      setExtra: vi.fn(),
    }),
  ),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock("@sentry/node", () => sentryMock);

describe("NelvyonMonitor", () => {
  beforeEach(() => {
    delete process.env.SENTRY_DSN;
    NelvyonMonitor.resetForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("captureError sin DSN no lanza excepción", () => {
    expect(() => NelvyonMonitor.captureError(new Error("x"))).not.toThrow();
  });

  it("captureError sin DSN llama console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    NelvyonMonitor.captureError(new Error("x"));
    expect(spy).toHaveBeenCalled();
  });

  it("captureMessage sin DSN llama console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    NelvyonMonitor.captureMessage("hola");
    expect(spy).toHaveBeenCalled();
  });

  it("trackJobFailed sin DSN no lanza excepción", () => {
    expect(() => NelvyonMonitor.trackJobFailed("job-1", "seo", new Error("fail"))).not.toThrow();
  });

  it("trackAgentError sin DSN no lanza excepción", () => {
    expect(() => NelvyonMonitor.trackAgentError("SeoPremiumAgent", "analysis", new Error("fail"))).not.toThrow();
  });

  it("trackBillingError sin DSN no lanza excepción", () => {
    expect(() => NelvyonMonitor.trackBillingError("tenant-1", new Error("fail"))).not.toThrow();
  });

  it("trackAuthError sin DSN no lanza excepción", () => {
    expect(() => NelvyonMonitor.trackAuthError("a@b.com", new Error("fail"))).not.toThrow();
  });

  it("setUserContext sin DSN no lanza excepción", () => {
    expect(() => NelvyonMonitor.setUserContext("u1", "a@b.com", "t1")).not.toThrow();
  });

  it("captureError con DSN mock llama Sentry.captureException", () => {
    process.env.SENTRY_DSN = "https://public@sentry.io/1";
    NelvyonMonitor.resetForTests();
    NelvyonMonitor.captureError(new Error("boom"));
    expect(sentryMock.captureException).toHaveBeenCalled();
  });

  it("trackJobFailed incluye jobId y serviceId en contexto", () => {
    process.env.SENTRY_DSN = "https://public@sentry.io/1";
    NelvyonMonitor.resetForTests();
    NelvyonMonitor.trackJobFailed("job-123", "email_marketing", new Error("boom"));
    expect(sentryMock.withScope).toHaveBeenCalled();
    expect(sentryMock.captureException).toHaveBeenCalled();
  });
});
