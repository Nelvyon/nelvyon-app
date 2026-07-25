# Android device smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T16:31:24.531Z |
| APK | `C:\Proyectos\Nelvyon\nelvyon-app\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk` |
| SHA256 | `dd71570440e59366bbbb64b14a5b3e3302ba0c2fa442bf35d1335e5e1393ed30` |
| Size | 4795968 bytes |
| adb devices | 0 |
| Verdict | **BLOCKED_EXTERNAL** |

## Steps

| Step | Result |
|------|--------|
| 1 APK present | PASS |
| 2 adb device | BLOCKED_EXTERNAL |
| 3 install | BLOCKED_EXTERNAL |

## Next (Daniel)

1. Connect phone with USB debugging OR start an AVD
2. Confirm: adb devices lists the target
3. adb install -r C:\Proyectos\Nelvyon\nelvyon-app\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
4. Open app → SaaS login → confirm tenant isolation visually

## Raw adb

```
List of devices attached
```
