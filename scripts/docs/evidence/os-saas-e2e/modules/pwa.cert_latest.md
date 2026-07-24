# PWA certification

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-24T17:54:22.936Z |
| Resultado | PASS |
| iOS Safari "Add to Home Screen" | PARTIAL — no verificado en dispositivo real en esta sesión |

## manifest.json

- Resultado: PASS
- Campos requeridos ausentes: ninguno
- Iconos declarados: 2
- Iconos faltantes en disco: ninguno
- Estrategia offline documentada en sw.js: sí

## manifest-saas.json

- Resultado: PASS
- Campos requeridos ausentes: ninguno
- Iconos declarados: 2
- Iconos faltantes en disco: ninguno
- Estrategia offline documentada en sw.js: sí

## Honestidad

- No se marca "iOS Safari install" como VERIFIED sin una prueba real en dispositivo/simulador — queda PARTIAL en este documento hasta que ops lo confirme manualmente.
- Este script solo audita manifest+sw en disco; no publica, despliega ni modifica nada.
- Los iconos PWA de manifest-saas.json usan icon-base.svg (existente). Si se quiere un set PNG multi-tamaño, ejecutar `node apps/web/scripts/generate-pwa-icons.mjs` (usa `sharp`, ya en devDependencies) y actualizar el manifest.
