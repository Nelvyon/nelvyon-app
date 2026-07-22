import { afterEach, describe, expect, it } from "vitest";
import {
  assertOllamaHostSafeForRuntime,
  getLocalAiRuntimePrepSnapshot,
} from "../OllamaRuntimePrep";

describe("OllamaRuntimePrep fail-closed", () => {
  afterEach(() => {
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.NODE_ENV;
    delete process.env.AUTONOMOUS_QUALITY_ROUTING;
  });

  it("rejects unset host", () => {
    delete process.env.OLLAMA_HOST;
    const r = assertOllamaHostSafeForRuntime({ allowLoopback: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("OLLAMA_HOST_unset");
  });

  it("rejects loopback when remote runtime", () => {
    process.env.OLLAMA_HOST = "http://127.0.0.1:11434";
    const r = assertOllamaHostSafeForRuntime({ allowLoopback: false });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("OLLAMA_HOST_loopback_forbidden_on_remote_runtime");
  });

  it("allows private mesh-style host", () => {
    process.env.OLLAMA_HOST = "http://100.64.0.2:11434";
    const r = assertOllamaHostSafeForRuntime({ allowLoopback: false });
    expect(r.ok).toBe(true);
  });

  it("snapshot reports quality routing OFF by default", () => {
    const s = getLocalAiRuntimePrepSnapshot();
    expect(s.qualityRouting).toBe(false);
    expect(s.neoActivationBlocked.length).toBeGreaterThan(0);
  });
});
