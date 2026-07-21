import { describe, expect, it } from "vitest";
import { assertSafeEgressUrl, isSafeEgressUrl } from "../safeEgressUrl";

describe("assertSafeEgressUrl", () => {
  it("allows public HTTPS URLs", () => {
    expect(assertSafeEgressUrl("https://hooks.example.com/path").hostname).toBe("hooks.example.com");
  });

  it("rejects http, localhost, private IPs and metadata", () => {
    expect(() => assertSafeEgressUrl("http://example.com")).toThrow(/HTTPS/i);
    expect(() => assertSafeEgressUrl("https://localhost/x")).toThrow(/not allowed/i);
    expect(() => assertSafeEgressUrl("https://127.0.0.1/x")).toThrow(/not allowed/i);
    expect(() => assertSafeEgressUrl("https://10.0.0.5/x")).toThrow(/not allowed/i);
    expect(() => assertSafeEgressUrl("https://192.168.1.1/x")).toThrow(/not allowed/i);
    expect(() => assertSafeEgressUrl("https://169.254.169.254/latest")).toThrow(/not allowed/i);
    expect(isSafeEgressUrl("https://evil.local/hook")).toBe(false);
  });
});
