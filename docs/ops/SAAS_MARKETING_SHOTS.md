# Capturas marketing SaaS NELVYON

## Qué es

Capturas de la **UI real** `/saas/*` (Next.js + SaasShell) con tenant demo seguro **Nelvyon Demo · Aether Labs**.  
No es login a producción ni datos de clientes reales.

## Salida

| Ruta | Uso |
|------|-----|
| `apps/web/public/brand/public/saas-shots/*.webp` | Hero / showcases |
| `apps/web/public/brand/public/saas-shots/cards/*.webp` | Cards / thumbs |
| `apps/web/public/brand/public/saas-shots/raw/*.png` | Fuente (gitignore recomendado) |
| `apps/web/public/brand/public/saas-shots/manifest.json` | Inventario |

## Regenerar

```bash
# Terminal A — heap alto
cd apps/web
set JWT_SECRET=test-secret-for-playwright-saas-e2e
set NODE_OPTIONS=--max-old-space-size=8192
pnpm exec cross-env PORT=3010 next dev -p 3010 -H 127.0.0.1

# Terminal B
cd apps/web
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010
pnpm exec playwright test --config playwright.marketing-shots.config.ts
node ./scripts/optimize-saas-shots.mjs
```

Fixtures: `e2e/saas/marketingDemoData.ts`  
Consumo web: `features/public-web/components/SaasProductCapture.tsx`

## Reglas

- Emails solo `*.example`
- Sin tokens/secretos en UI capturada
- Si una pantalla cae en “Algo salió mal”, el job falla (no publicar error UI)
- Foto humana / oficinas → Envato wishlist aparte (`docs/ops/ENVATO_PUBLIC_WEB_WISHLIST.md`)
