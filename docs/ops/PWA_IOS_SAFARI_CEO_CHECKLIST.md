# Checklist Daniel — verificar PWA en Safari/iOS

> **Estado iOS Safari "Add to Home Screen": `PARTIAL` / `BLOCKED_EXTERNAL`.**
> Requiere un iPhone/iPad físico o el simulador de Xcode — ningún agente en
> este entorno (Windows, sin macOS/Xcode) puede ejecutar Safari real ni un
> simulador iOS. No se marca `PASS`/`VERIFIED` hasta que Daniel complete estos
> 3 pasos y lo confirme. Ver evidencia Chrome/Windows (ya `VERIFIED`) en
> `scripts/docs/evidence/os-saas-e2e/modules/pwa.cert_latest.md`.

## Pasos (máximo 3)

1. Desde un iPhone/iPad con Safari, abre `https://app.nelvyon.com/saas/dashboard`
   (o la URL de staging), inicia sesión y comprueba que la app carga con normalidad.
2. Toca **Compartir** (icono cuadrado con flecha) → **Añadir a pantalla de inicio**.
   Verifica que aparece el icono de NELVYON (no un icono genérico/roto) y el nombre
   correcto, y que al abrir desde el icono la app se ve en modo standalone (sin
   barra de Safari).
3. Con la app abierta desde el icono, activa el modo avión y recarga: la pantalla
   de "offline" (`/offline.html` o `/offline-saas.html`) debe mostrarse en lugar de
   un error genérico de Safari.

## Después de probar

Responde en este chat o actualiza este documento con el resultado real (PASS o
lista de fallos concretos). Solo entonces se puede subir el estado a `VERIFIED`
en `scripts/docs/evidence/os-saas-e2e/modules/pwa.cert_latest.md` — nunca antes,
y nunca por inferencia desde el resultado de Chrome/Windows.
