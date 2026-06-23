import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signTrackingToken, verifyTrackingToken } from "../trackingToken";

const SECRET = "test-tracking-secret-32chars-long!!";

beforeEach(() => {
  process.env.TRACKING_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.TRACKING_SECRET;
});

describe("signTrackingToken / verifyTrackingToken", () => {
  it("genera token verificable para open", () => {
    const token = signTrackingToken({ tid: "t1", cid: "c1", rid: "r1", t: "o" });
    const result = verifyTrackingToken(token);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.tid).toBe("t1");
    expect(result.payload.cid).toBe("c1");
    expect(result.payload.rid).toBe("r1");
    expect(result.payload.t).toBe("o");
  });

  it("genera token verificable para click con URL", () => {
    const token = signTrackingToken({ tid: "t1", cid: "c1", rid: "r1", t: "c", url: "https://example.com" });
    const result = verifyTrackingToken(token);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.t).toBe("c");
    expect(result.payload.url).toBe("https://example.com");
  });

  it("rechaza token con firma manipulada", () => {
    const token = signTrackingToken({ tid: "t1", cid: "c1", rid: "r1", t: "o" });
    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyTrackingToken(tampered).ok).toBe(false);
  });

  it("rechaza token expirado", () => {
    // Forzar exp en el pasado manipulando el payload directamente
    const payload = { tid: "t1", cid: "c1", rid: "r1", t: "o" as const, exp: 1 };
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const { createHmac } = require("crypto") as typeof import("crypto");
    const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
    const token = `${data}.${sig}`;
    const result = verifyTrackingToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("expired");
  });

  it("rechaza token malformado (sin punto)", () => {
    expect(verifyTrackingToken("notavalidtoken").ok).toBe(false);
  });

  it("tokens de distintos contactos son diferentes", () => {
    const t1 = signTrackingToken({ tid: "t1", cid: "c1", rid: "r1", t: "o" });
    const t2 = signTrackingToken({ tid: "t1", cid: "c1", rid: "r2", t: "o" });
    expect(t1).not.toBe(t2);
  });
});
