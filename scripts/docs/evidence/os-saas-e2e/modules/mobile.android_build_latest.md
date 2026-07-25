# Mobile Android local build (zero-cost)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25 |
| **VERDICT build** | **IMPLEMENTED_VERIFIED** — `assembleDebug` **BUILD SUCCESSFUL** |
| APK | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (~4.8 MB) |
| JDK | Microsoft OpenJDK **21** (Capacitor 7 requires source 21) |
| SDK | `platforms;android-35` + `build-tools;35.0.0` (cmdline-tools free) |
| Capacitor | `cap add android` + `cap sync` · `webDir=www` · `server.url=https://nelvyon.com/saas/dashboard` |
| Log | `mobile.android_assemble_log.txt` |

## Device install / E2E smoke

| Check | Result |
|-------|--------|
| `adb devices` | **empty** — no emulator / USB device attached |
| Auth / tenant / CRM / tasks / offline on device | **BLOCKED_EXTERNAL** — requires physical device or AVD |
| iOS / App Store | **BLOCKED_EXTERNAL** |
| Play Store publish | **BLOCKED_EXTERNAL** ($25) |

## Tools installed this session (free)

- Microsoft OpenJDK 17 + 21 (winget)
- Google Platform-Tools (`adb`)
- Android cmdline-tools + SDK 34/35 (licenses accepted)

## Rollback / notes

- APK is debug sideload only — not Play Store.
- `local.properties` gitignored (machine SDK path).
- Push notifications remain PREPARED_OFF until device smoke.
