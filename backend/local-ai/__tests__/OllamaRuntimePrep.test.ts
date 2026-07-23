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

  it("allows MagicDNS ts.net host", () => {
    process.env.OLLAMA_HOST = "http://gpu.tailnet.ts.net:11434";
    const r = assertOllamaHostSafeForRuntime({
      allowLoopback: false,
      requirePrivateMesh: true,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects public hostname when mesh required", () => {
    process.env.OLLAMA_HOST = "http://ollama.example.com:11434";
    const r = assertOllamaHostSafeForRuntime({
      allowLoopback: false,
      requirePrivateMesh: true,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("OLLAMA_HOST_not_tailscale_mesh");
  });

  it("rejects public IPv4 when mesh required", () => {
    process.env.OLLAMA_HOST = "http://8.8.8.8:11434";
    const r = assertOllamaHostSafeForRuntime({
      allowLoopback: false,
      requirePrivateMesh: true,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("OLLAMA_HOST_not_tailscale_mesh");
  });

  it("snapshot reports quality routing OFF by default", () => {
    const s = getLocalAiRuntimePrepSnapshot();
    expect(s.qualityRouting).toBe(false);
    expect(s.neoActivationBlocked.length).toBeGreaterThan(0);
    expect(s.probeTimeoutMsDefault).toBe(5_000);
    expect(s.rollbackHints.length).toBeGreaterThan(0);
  });
});
