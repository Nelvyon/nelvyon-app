import { describe, expect, it } from "vitest";

function resolveRedirectPath(next: string | null): string {
  const trimmed = next?.trim();
  if (trimmed && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  return "/dashboard";
}

function readErrorMessage(data: unknown): string {
  if (typeof data !== "object" || data === null) return "Credenciales incorrectas";
  const o = data as { message?: unknown; error?: unknown };
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  if (typeof o.error === "string" && o.error.trim()) return o.error;
  return "Credenciales incorrectas";
}

describe("login helpers", () => {
  it("resolveRedirectPath uses safe internal next", () => {
    expect(resolveRedirectPath("/saas/dashboard")).toBe("/saas/dashboard");
    expect(resolveRedirectPath("  /admin  ")).toBe("/admin");
  });

  it("resolveRedirectPath rejects open redirects", () => {
    expect(resolveRedirectPath("//evil.com")).toBe("/dashboard");
    expect(resolveRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(resolveRedirectPath(null)).toBe("/dashboard");
  });

  it("readErrorMessage prefers API message", () => {
    expect(readErrorMessage({ message: "Credenciales incorrectas" })).toBe("Credenciales incorrectas");
    expect(readErrorMessage({ error: "Invalid credentials" })).toBe("Invalid credentials");
    expect(readErrorMessage(null)).toBe("Credenciales incorrectas");
  });
});
