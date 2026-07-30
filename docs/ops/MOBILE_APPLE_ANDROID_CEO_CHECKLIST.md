# Mobile — Apple / Android CEO checklist

Honest status of the `apps/mobile/` Capacitor shell relative to real device
builds and app store publishing. Source of truth: `backend/agency/MobileAppContract.ts`
(tested — `backend/agency/__tests__/MobileAppContract.test.ts`).

**No task in this document was executed with a paid account.** This session
did not open, pay for, or configure any Apple Developer Program or Google
Play Console account. Nothing here should be read as "app is published" or
"app is in review" — it is not.

Evidencia Android (2026-07-30):
- Scaffold: `scripts/docs/evidence/os-saas-e2e/modules/mobile.android_scaffold.md`
- Debug build: `scripts/docs/evidence/os-saas-e2e/modules/mobile.android_build_latest.md`
- **Release APK:** `scripts/docs/evidence/os-saas-e2e/modules/mobile.android_release_latest.md`
  (`assembleRelease` SUCCESS · v1.0.0 · SHA-256 in evidence · device smoke still human)

---

## Apple (iOS) — BLOCKED_EXTERNAL

| Step | Status | Blocker |
|---|---|---|
| iOS local build (`pnpm -C apps/mobile ios`) | BLOCKED_EXTERNAL | Requires macOS + Xcode. Not available in this environment. |
| Apple Developer Program enrollment | BLOCKED_EXTERNAL | **Paid** ($99/yr). Explicitly out of scope — no Apple paid account authorized. |
| App Store Connect app record | BLOCKED_EXTERNAL | Depends on the enrollment above. |
| TestFlight / App Store submission | BLOCKED_EXTERNAL | Depends on both of the above. |
| Install smoke (simulator/device) | **NOT RUN** | No PASS claimed without real device evidence. |

### What the CEO needs to do (when ready to spend)

1. Enroll in the Apple Developer Program (personal or organization) — $99/yr.
2. Provide a Mac (owned, rented CI runner, or a cloud Mac service) for Xcode
   builds and signing — this repo cannot build/sign iOS binaries without one.
3. Once both exist, re-run this checklist and update
   `backend/agency/MobileAppContract.ts` with real evidence (App Store
   Connect app id) before flipping any status away from `BLOCKED_EXTERNAL`.

---

## Android — scaffold PASS · local build VERIFIED · device smoke BLOCKED_EXTERNAL

| Step | Status | Blocker |
|---|---|---|
| Native project (`apps/mobile/android/`) | **PASS** (scaffold) | Capacitor Android project **exists** on disk. |
| Android SDK / JDK / `adb` | **VERIFIED** (local machine) | OpenJDK 21 + cmdline-tools + SDK 35 used for assembleDebug. |
| Android local debug build (APK) | **IMPLEMENTED_VERIFIED** | `assembleDebug` **BUILD SUCCESSFUL** · evidence `mobile.android_build_latest.md`. |
| Android **release** APK (signed sideload) | **IMPLEMENTED_VERIFIED** | `assembleRelease` via `scripts/build-android-release-apk.mjs` · evidence `mobile.android_release_latest.md`. |
| Local device/emulator install + smoke test | **PASS (emulator)** | AVD `Nelvyon_API35` · evidence `mobile.android_emulator_phase3_2026-07-30.md` · physical device still **BLOCKED_EXTERNAL** for FCM/OEM/Play. |
| Google Play Console registration | BLOCKED_EXTERNAL | **Paid** (one-time $25). No budget approved. |
| Play Store listing + review submission | BLOCKED_EXTERNAL | Depends on the registration above. |

### What remains verified (no store / no device)

| Capability | Status | Evidence |
|---|---|---|
| Capacitor shell config | IMPLEMENTED_VERIFIED | `apps/mobile/capacitor.config.json` + `package.json` |
| Android native scaffold | IMPLEMENTED_VERIFIED | `apps/mobile/android/` + `mobile.android_scaffold.md` |
| Local `assembleDebug` APK | IMPLEMENTED_VERIFIED | `mobile.android_build_latest.md` |
| Device install smoke | BLOCKED_EXTERNAL | Needs phone/AVD |
| Tenant-isolated secure session | IMPLEMENTED_VERIFIED | `MobileSecureSession.ts` + unit tests |
| Offline action queue (basic) | IMPLEMENTED_VERIFIED | `MobileSecureSession.ts` + unit tests |

### Exact next clicks for Daniel (device smoke — $0 Play fee)

1. Connect a phone with USB debugging **or** create an AVD in Android Studio.
2. Confirm `adb devices` lists the target.
3. Install release: `adb install -r .release-logs/android/nelvyon-saas-1.0.0-*.apk`  
   (or debug: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`)
4. Open app → SaaS webview + tenant login. Write evidence before claiming device PASS.
5. **Still do not flip Play Store publish** without the $25 Console registration + CEO approval.

---

## Rollback / no-op guarantee

Nothing in this checklist, `MobileAppContract.ts`, or `MobileSecureSession.ts`
enables any network call to Apple or Google services, any payment, or any
store submission. All of it is either local tooling documentation or pure,
unit-tested TypeScript.
