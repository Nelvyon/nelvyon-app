# Mobile Android — Capacitor scaffold PASS · build superseded by assembleDebug VERIFIED

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25 |
| Scaffold | **PASS** — `apps/mobile/android/` presente |
| Local build | **SUPERSEDED** → ver `mobile.android_build_latest.md` (**assembleDebug BUILD SUCCESSFUL**) |
| Device install smoke | **BLOCKED_EXTERNAL** (sin adb device/AVD) |
| Play Store / iOS | **BLOCKED_EXTERNAL** |

> Esta nota de scaffold queda histórica. El estado vivo de build es
> `mobile.android_build_latest.md`. No reclamar device smoke PASS.

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| android_project_scaffold | **PASS** | `apps/mobile/android/` presente (`build.gradle`, `app/`, `gradlew`, `MainActivity.java`) |
| capacitor_shell | PASS | `apps/mobile/capacitor.config.json` + `apps/mobile/package.json` |
| local.properties | ignored | `apps/mobile/android/.gitignore` + root `.gitignore` cover `local.properties` (SDK path must not commit) |
| android_sdk / JDK | FAIL (blocker) | Required for `assembleDebug` — not verified available in this session |
| adb | FAIL (blocker) | Needed for install smoke after APK |
| assembleDebug APK | **NOT RUN** | No `app-debug.apk` produced — do not claim build VERIFIED |
| emulator_or_device | FAIL (blocker) | Sin emulador/dispositivo — imposible install smoke |
| install_smoke | **NOT RUN** | **No PASS** sin APK + adb |
| MobileSecureSession unit tests | PASS | tenant-isolated session + offline queue |
| MobileAppContract unit tests | PASS | integrity + honest android scaffold/blocked build |

## Honest contract mapping

| Capability id | Status | Note |
|---------------|--------|------|
| `capacitor_shell` | IMPLEMENTED_VERIFIED | config only |
| `android_local_build` | **BLOCKED_EXTERNAL** | scaffold evidence path set; build blocked until SDK |
| `ios_local_build` | BLOCKED_EXTERNAL | macOS/Xcode |
| `ios_app_store_publish` | BLOCKED_EXTERNAL | paid Apple account |
| `android_play_store_publish` | BLOCKED_EXTERNAL | $25 / no budget |

## Next (Daniel)

See exact Studio/SDK/`assembleDebug` clicks in
`docs/ops/MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md` § Android.

## Referencias

- `docs/ops/MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md`
- `backend/agency/MobileAppContract.ts`
- Prior (pre-scaffold) note: `mobile.android_blocked.md`
