import { describe, expect, it } from "vitest";
import {
  MOBILE_APP_CAPABILITIES,
  assertMobileAppContractIntegrity,
  getMobileCapability,
  getMobileStorePublishBlockReason,
  listMobileAppCapabilities,
} from "../MobileAppContract";

describe("MobileAppContract", () => {
  it("passes its own integrity assertion", () => {
    expect(assertMobileAppContractIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("lists all capabilities as a defensive copy", () => {
    const list = listMobileAppCapabilities();
    expect(list.length).toBe(MOBILE_APP_CAPABILITIES.length);
    list.push({
      id: "fake",
      title: "fake",
      status: "NOT_IMPLEMENTED",
      description: "",
      evidence: null,
      blockedReason: null,
    });
    expect(MOBILE_APP_CAPABILITIES.length).not.toBe(list.length);
  });

  it("never claims an App Store or Play Store publish is verified", () => {
    for (const id of ["ios_app_store_publish", "android_play_store_publish"] as const) {
      const cap = getMobileCapability(id);
      expect(cap?.status).toBe("BLOCKED_EXTERNAL");
      expect(cap?.evidence).toBeNull();
      expect(cap?.blockedReason).toBeTruthy();
    }
  });

  it("blocks iOS publish citing the paid Apple Developer account constraint", () => {
    const reason = getMobileStorePublishBlockReason("ios_app_store_publish");
    expect(reason.toLowerCase()).toContain("apple developer program");
  });

  it("blocks Android Play Store publish citing the registration fee / no approved budget", () => {
    const reason = getMobileStorePublishBlockReason("android_play_store_publish");
    expect(reason.toLowerCase()).toContain("budget");
  });

  it("every IMPLEMENTED_VERIFIED capability carries real evidence", () => {
    for (const cap of MOBILE_APP_CAPABILITIES) {
      if (cap.status === "IMPLEMENTED_VERIFIED") {
        expect(cap.evidence).toBeTruthy();
      }
    }
  });

  it("secure session + offline queue capabilities are verified with evidence pointing at real tested code", () => {
    const session = getMobileCapability("secure_tenant_session");
    const queue = getMobileCapability("offline_queue_basic");
    expect(session?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(session?.evidence).toContain("MobileSecureSession");
    expect(queue?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(queue?.evidence).toContain("MobileSecureSession");
  });

  it("android_local_build is VERIFIED with APK assembleDebug evidence", () => {
    const cap = getMobileCapability("android_local_build");
    expect(cap?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(cap?.evidence).toContain("mobile.android_build_latest.md");
    expect(cap?.blockedReason).toBeNull();
  });

  it("android device smoke stays BLOCKED_EXTERNAL until adb has a device", () => {
    const cap = getMobileCapability("android_device_smoke");
    expect(cap?.status).toBe("BLOCKED_EXTERNAL");
    expect(cap?.blockedReason?.toLowerCase()).toMatch(/adb|device|emulator/);
  });

  it("never claims iOS local build or store publish is green", () => {
    expect(getMobileCapability("ios_local_build")?.status).toBe("BLOCKED_EXTERNAL");
    expect(getMobileCapability("ios_app_store_publish")?.status).toBe("BLOCKED_EXTERNAL");
    expect(getMobileCapability("android_play_store_publish")?.status).toBe("BLOCKED_EXTERNAL");
  });
});
