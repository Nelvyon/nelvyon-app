/**
 * Mobile app capability contract (Capacitor shell, `apps/mobile/`).
 * Honest inventory — no capability may claim a store publish that has not
 * actually happened. Apple requires a paid Developer Program account
 * ($99/yr, no Apple account authorized for this project) plus macOS + Xcode
 * (unavailable in this environment); Google Play requires a one-time $25
 * registration fee (no budget approved). Both stay `BLOCKED_EXTERNAL`
 * forever until a human completes the real store setup and this file is
 * updated with real evidence (App Store Connect id / Play Console URL).
 *
 * See `docs/ops/MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md` for the CEO checklist.
 */

export type MobileCapabilityStatus =
  | "IMPLEMENTED_VERIFIED"
  | "PREPARED_OFF"
  | "BLOCKED_EXTERNAL"
  | "NOT_IMPLEMENTED";

export type MobileCapabilityEntry = {
  id: string;
  title: string;
  status: MobileCapabilityStatus;
  description: string;
  evidence: string | null;
  blockedReason: string | null;
};

const PUBLISH_CAPABILITY_IDS = ["ios_app_store_publish", "android_play_store_publish"] as const;

export const MOBILE_APP_CAPABILITIES: readonly MobileCapabilityEntry[] = [
  {
    id: "capacitor_shell",
    title: "Capacitor shell (webview wrapper)",
    status: "IMPLEMENTED_VERIFIED",
    description:
      "apps/mobile wraps the live SaaS webapp (https://nelvyon.com/saas/dashboard) in a native webview via Capacitor 7.",
    evidence: "apps/mobile/capacitor.config.json + apps/mobile/package.json",
    blockedReason: null,
  },
  {
    id: "secure_tenant_session",
    title: "Tenant-isolated secure session",
    status: "IMPLEMENTED_VERIFIED",
    description:
      "Every mobile HTTP call is required to carry X-Tenant-Id + a Bearer auth token; cross-tenant requests hard-fail with a thrown error.",
    evidence: "backend/agency/MobileSecureSession.ts + backend/agency/__tests__/MobileSecureSession.test.ts",
    blockedReason: null,
  },
  {
    id: "offline_queue_basic",
    title: "Offline action queue (basic)",
    status: "IMPLEMENTED_VERIFIED",
    description:
      "In-memory bounded queue with capped retries for actions captured while offline (notes, task/lead status updates, message drafts). Not yet wired to persistent on-device storage — resets on app restart.",
    evidence: "backend/agency/MobileSecureSession.ts (MobileOfflineQueue) + tests",
    blockedReason: null,
  },
  {
    id: "push_notifications",
    title: "Push notifications (Capacitor plugin)",
    status: "PREPARED_OFF",
    description: "@capacitor/push-notifications is configured and shares VAPID keys with the existing /saas/pwa web push.",
    evidence: null,
    blockedReason: "Not exercised on a real device/emulator in this session — no false VERIFIED claim.",
  },
  {
    id: "android_local_build",
    title: "Android local debug build (no store, no cost)",
    status: "BLOCKED_EXTERNAL",
    description:
      "`pnpm -C apps/mobile sync` must generate `apps/mobile/android/` first; then Android Studio/SDK can build a sideloadable debug APK at zero Play Console cost.",
    evidence: null,
    blockedReason:
      "Android SDK/adb not present; apps/mobile/android/ missing (capacitor sync not run) — see scripts/docs/evidence/os-saas-e2e/modules/mobile.android_blocked.md.",
  },
  {
    id: "ios_local_build",
    title: "iOS local build (simulator)",
    status: "BLOCKED_EXTERNAL",
    description: "`pnpm -C apps/mobile ios` requires macOS + Xcode.",
    evidence: null,
    blockedReason: "No macOS/Xcode hardware available in this environment.",
  },
  {
    id: "ios_app_store_publish",
    title: "Apple App Store publish",
    status: "BLOCKED_EXTERNAL",
    description: "Publishing the app to the Apple App Store.",
    evidence: null,
    blockedReason:
      "Requires a paid Apple Developer Program account ($99/yr) — explicitly out of scope for this task (no Apple paid account).",
  },
  {
    id: "android_play_store_publish",
    title: "Google Play Store publish",
    status: "BLOCKED_EXTERNAL",
    description: "Publishing the app to Google Play.",
    evidence: null,
    blockedReason: "Requires a one-time $25 Play Console registration fee — no budget approved in this session.",
  },
] as const;

export function listMobileAppCapabilities(): MobileCapabilityEntry[] {
  return [...MOBILE_APP_CAPABILITIES];
}

export function getMobileCapability(id: string): MobileCapabilityEntry | undefined {
  return MOBILE_APP_CAPABILITIES.find((c) => c.id === id);
}

/** Always returns a non-null block reason for store-publish actions — CEO/budget gate, on until a real paid account exists. */
export function getMobileStorePublishBlockReason(
  capabilityId: (typeof PUBLISH_CAPABILITY_IDS)[number],
): string {
  const cap = getMobileCapability(capabilityId);
  return cap?.blockedReason ?? "publish_blocked_no_evidence";
}

export function assertMobileAppContractIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const publishId of PUBLISH_CAPABILITY_IDS) {
    const cap = getMobileCapability(publishId);
    if (!cap) {
      violations.push(`missing_publish_capability:${publishId}`);
      continue;
    }
    if (cap.status === "IMPLEMENTED_VERIFIED") {
      violations.push(`publish_must_never_be_verified_without_real_store_evidence:${publishId}`);
    }
    if (cap.status !== "BLOCKED_EXTERNAL") {
      violations.push(`publish_must_stay_blocked_external:${publishId}`);
    }
    if (!cap.blockedReason) {
      violations.push(`publish_missing_blocked_reason:${publishId}`);
    }
  }

  for (const c of MOBILE_APP_CAPABILITIES) {
    if (c.status === "IMPLEMENTED_VERIFIED" && !c.evidence) {
      violations.push(`verified_without_evidence:${c.id}`);
    }
  }

  return { ok: violations.length === 0, violations };
}
