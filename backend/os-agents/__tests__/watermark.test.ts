import { afterEach, describe, expect, it, vi } from "vitest";

import { embedJsonWatermark, embedTextWatermark } from "../watermark";

describe("watermark", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("embedTextWatermark texto largo en producción añade firma", () => {
    vi.stubEnv("NODE_ENV", "production");
    const long = `${"x".repeat(101)}`;
    const out = embedTextWatermark(long);
    expect(out).toContain("NELVYON AI");
    expect(out.length).toBeGreaterThan(long.length);
  });

  it("embedTextWatermark texto corto no añade nada", () => {
    vi.stubEnv("NODE_ENV", "production");
    const short = "hola";
    expect(embedTextWatermark(short)).toBe(short);
  });

  it("embedTextWatermark en test no añade nada", () => {
    vi.stubEnv("NODE_ENV", "test");
    const long = `${"y".repeat(200)}`;
    expect(embedTextWatermark(long)).toBe(long);
  });

  it("embedJsonWatermark añade _nelvyon_generated", () => {
    const o = embedJsonWatermark({ a: 1 });
    expect(o).toEqual({ a: 1, _nelvyon_generated: true });
  });

  it("embedJsonWatermark con array no modifica", () => {
    const arr = [1, 2, 3];
    expect(embedJsonWatermark(arr as unknown)).toBe(arr);
  });
});
