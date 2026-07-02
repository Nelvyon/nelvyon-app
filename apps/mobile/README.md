# Nelvyon Mobile (Capacitor)

Production shell that loads the live SaaS app from `https://nelvyon.com/saas/dashboard`.

```bash
pnpm -C apps/mobile sync
pnpm -C apps/mobile ios    # requires macOS + Xcode
pnpm -C apps/mobile android
```

Push notifications use the same VAPID keys as `/saas/pwa`.
