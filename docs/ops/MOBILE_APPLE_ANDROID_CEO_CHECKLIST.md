# Mobile — Apple / Android CEO checklist

Honest status of the `apps/mobile/` Capacitor shell relative to real device
builds and app store publishing. Source of truth: `backend/agency/MobileAppContract.ts`
(tested — `backend/agency/__tests__/MobileAppContract.test.ts`).

**No task in this document was executed with a paid account.** This session
did not open, pay for, or configure any Apple Developer Program or Google
Play Console account. Nothing here should be read as "app is published" or
"app is in review" — it is not.

Evidencia Android scaffold (2026-07-25):
`scripts/docs/evidence/os-saas-e2e/modules/mobile.android_scaffold.md`
(scaffold **PASS** · build/smoke still **BLOCKED** without JDK/SDK).

Prior blocked note (pre-scaffold):
`scripts/docs/evidence/os-saas-e2e/modules/mobile.android_blocked.md`.

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

## Android — scaffold PASS · build BLOCKED_EXTERNAL

| Step | Status | Blocker |
|---|---|---|
| Native project (`apps/mobile/android/`) | **PASS** (scaffold) | Capacitor Android project **exists** on disk (sync already run). |
| Android SDK / JDK / `adb` | BLOCKED_EXTERNAL | **Not installed** (or not on PATH) on this Windows machine — needed for `assembleDebug`. |
| Android local debug build (APK) | BLOCKED_EXTERNAL | Requires Android Studio + SDK + JDK — **no APK** produced yet. |
| Local device/emulator install + smoke test | **NOT RUN** | **No PASS claimed** — no APK, no adb, no emulator/device. |
| Google Play Console registration | BLOCKED_EXTERNAL | **Paid** (one-time $25 registration fee). No budget approved in this session. |
| Play Store listing + review submission | BLOCKED_EXTERNAL | Depends on the registration above. |

### What remains verified (no native binary)

| Capability | Status | Evidence |
|---|---|---|
| Capacitor shell config | IMPLEMENTED_VERIFIED | `apps/mobile/capacitor.config.json` + `package.json` |
| Android native scaffold | scaffold PASS (build still blocked) | `apps/mobile/android/` + `mobile.android_scaffold.md` |
| Tenant-isolated secure session | IMPLEMENTED_VERIFIED | `MobileSecureSession.ts` + unit tests |
| Offline action queue (basic) | IMPLEMENTED_VERIFIED | `MobileSecureSession.ts` + unit tests |

### Exact next clicks for Daniel (local debug APK — $0 Play fee)

Do these on the Windows machine that will build (Studio installs SDK under your user profile; paths stay out of git via `local.properties`):

1. **Install Android Studio** (Hedgehog+ / current stable) from https://developer.android.com/studio  
   - During setup wizard: accept **Android SDK**, **Android SDK Platform**, **Android Virtual Device** (optional if you use a physical phone).
2. **Open SDK Manager** (More Actions → SDK Manager, or Tools → SDK Manager):  
   - SDK Platforms: install a recent API (e.g. **API 34** or whatever `apps/mobile/android/variables.gradle` / Capacitor requires).  
   - SDK Tools: ensure **Android SDK Build-Tools**, **Platform-Tools** (`adb`), and **Android SDK Command-line Tools** are checked → Apply.
3. **JDK**: Studio ships a JBR; if CLI build fails, install Temurin JDK 17 and set `JAVA_HOME`.
4. **Open the project**:  
   ```bash
   pnpm -C apps/mobile sync
   pnpm -C apps/mobile android
   ```  
   Or File → Open → `C:\Proyectos\Nelvyon\nelvyon-app\apps\mobile\android`.
5. **First Gradle sync** in Studio — let it download wrappers/deps. Confirm `local.properties` was created with `sdk.dir=...` (gitignored; do not commit).
6. **Build debug APK**: Build → Build Bundle(s) / APK(s) → **Build APK(s)**  
   Or CLI from `apps/mobile/android`:  
   ```bash
   .\gradlew.bat assembleDebug
   ```  
   Expected artifact: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
7. **Install smoke** (only after APK exists):  
   - Emulator: Device Manager → Create Device → Cold Boot → `adb install -r app-debug.apk`  
   - Or USB phone with USB debugging: same `adb install`.  
   - Open app → confirm SaaS webview loads (tenant login). **Do not claim PASS in the contract until this step is done and evidence is written.**
8. After a real APK + install smoke, update `MobileAppContract.ts` `android_local_build` (status/evidence) and refresh `mobile.android_scaffold.md` / a new smoke evidence file. **Still do not flip Play Store publish** without the $25 Console registration + CEO approval.

A debug APK is sideloadable for internal testing at **zero Play Console cost** — but **this session produced no APK and claims no install PASS**.

---

## Rollback / no-op guarantee

Nothing in this checklist, `MobileAppContract.ts`, or `MobileSecureSession.ts`
enables any network call to Apple or Google services, any payment, or any
store submission. All of it is either local tooling documentation or pure,
unit-tested TypeScript.
