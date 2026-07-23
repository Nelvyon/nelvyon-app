import { afterEach, describe, expect, it } from "vitest";

import {
  assertLocalRuntimeUrl,
  assertPrivateOutboundAllowed,
  assertUrlAllowed,
  isInternetTaskAuthorized,
  isPrivateMode,
  resetPrivateModeForTests,
} from "../../private-ai/privateMode";

afterEach(() => resetPrivateModeForTests());

describe("privateMode", () => {
  it("defaults to ON when unset", () => {
    expect(isPrivateMode()).toBe(true);
  });

  it("respects PRIVATE_MODE=OFF", () => {
    process.env.PRIVATE_MODE = "OFF";
    expect(isPrivateMode()).toBe(false);
  });

  it("blocks remote LLM when ON", () => {
    expect(() => assertPrivateOutboundAllowed("remote_llm")).toThrow(/PRIVATE_MODE blocks remote_llm/);
  });

  it("allows outbound during authorized task window", () => {
    process.env.PRIVATE_MODE_INTERNET_UNTIL = new Date(Date.now() + 60_000).toISOString();
    expect(isInternetTaskAuthorized()).toBe(true);
    expect(() => assertPrivateOutboundAllowed("remote_llm")).not.toThrow();
  });

  it("allows Docker private LAN for Ollama in PRIVATE_MODE", () => {
    expect(() => assertLocalRuntimeUrl("http://192.168.1.5:11434")).not.toThrow();
    expect(() => assertLocalRuntimeUrl("http://127.0.0.1:11434")).not.toThrow();
  });

  it("allows Tailscale CGNAT and MagicDNS for mesh Option A", () => {
    expect(() => assertLocalRuntimeUrl("http://100.102.207.30:11434")).not.toThrow();
    expect(() => assertLocalRuntimeUrl("http://nelvyon.tail8fa77a.ts.net:11434")).not.toThrow();
  });

  it("blocks public Internet URLs", () => {
    expect(() => assertUrlAllowed("https://api.openai.com/v1/models", "external_fetch")).toThrow();
  });
});
