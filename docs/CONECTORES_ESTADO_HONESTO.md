# Conectores: estado honesto, sin activar ninguno

> Auditado el 2026-08-31 leyendo el árbol. **No se ha activado ningún conector,
> no se ha usado ninguna credencial y no se ha llamado a ningún proveedor.**
> Coste externo: 0,00 €.

## Los estados, y qué significan

| Estado | Significa |
|---|---|
| `CODE_READY` | el código está completo y probado en local; falta la credencial |
| `CREDENTIAL_REQUIRED` | idem, y además exige una credencial que no existe |
| `PROVIDER_APPROVAL_REQUIRED` | además necesita que el proveedor apruebe la app |
| `STUB` | es un esqueleto: no hace la llamada real |
| `BROKEN` | tiene un defecto conocido que impediría funcionar |

**Ninguno está en `PROVIDER_VERIFIED`, y no puede estarlo**: eso exige una
llamada real a un proveedor real con una credencial real.

## Los doce de `backend/integrations`

| Conector | Líneas | Estado | Notas |
|---|---:|---|---|
| DataForSeoAdapter | 90 | `CODE_READY` | el más pequeño; sin revocación |
| GoogleAdsService | 379 | `CREDENTIAL_REQUIRED` | lee credenciales del entorno |
| GoogleAnalytics4Service | 311 | `CODE_READY` | |
| GoogleSearchConsoleService | 334 | `CODE_READY` | |
| LinkedInAdsService | 381 | `CODE_READY` | |
| MetaAdsService | 321 | `CODE_READY` | el token viaja en la query de Meta Graph |
| SemrushService | 304 | `CODE_READY` | |
| ShopifyService | 372 | `CODE_READY` | |
| TelegramService | 299 | `CODE_READY` | |
| TikTokAdsService | 394 | `CODE_READY` | |
| TwilioService | 306 | `CODE_READY` | **envía SMS: cuesta dinero al activarse** |
| WhatsAppService | 290 | `CODE_READY` | |

## El defecto que se encontró y se corrigió

**Los doce llamaban al proveedor sin plazo.** Once compartían la línea exacta:

```ts
return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
```

`fetch` no tiene plazo por defecto. Si el proveedor acepta la conexión y no
responde, la promesa se queda esperando **y con ella el trabajador que la lanzó**.
No da error, no reintenta, no sale en ningún registro como fallo: deja de
avanzar y ya.

No era que faltara la herramienta: `fetchWithTimeout` existe en este árbol con
ese comentario escrito —*«prevents cron/worker hangs on slow upstreams»*— y
**ocho servicios de `backend/saas` ya lo usaban**. Los de `backend/integrations`
se quedaron sin migrar y nadie lo comprobaba.

Migrados los once, con guardián permanente
(`ningunConectorLlamaSinPlazo.test.ts`) que prohíbe `globalThis.fetch` y exige
`fetchWithTimeout` a todo el que salga a la red.

## Lo que sigue faltando, medido y sin arreglar

Ninguno de los doce tiene:

- **reintento con espera creciente** — un 429 o un 503 se propaga como fallo
  definitivo;
- **idempotencia** — un reintento del trabajador puede duplicar el efecto. En
  `TwilioService` eso significa **enviar el SMS dos veces**, y cada uno cuesta;
- **sonda de salud** — no hay forma de saber si una credencial sigue valiendo
  sin intentar una operación real;
- **manejo de límite de tasa** — nadie mira `429` ni las cabeceras de cuota;
- **redacción de secretos en sus propios errores** — ahora la cubre el
  registrador central, que sí redacta, pero el conector no lo hace por su cuenta.

**No lo arreglo esta noche, y digo por qué**: reintentos e idempotencia solo se
pueden diseñar bien sabiendo qué garantiza cada proveedor —cuáles aceptan clave
de idempotencia, cuáles son seguros de reintentar, qué devuelven al limitar—, y
eso exige su documentación y, para verificarlo, una llamada real. Inventarlo a
ciegas produciría reintentos que duplican cobros.

## Lo que hace falta para pasar a `PROVIDER_VERIFIED`

Para cada conector, y **ninguna de estas cosas es local ni gratuita**:

1. una credencial real del proveedor;
2. en Meta, TikTok y Google: **aprobación de la app** y permisos revisados;
3. una llamada real de ida y vuelta;
4. en Twilio y WhatsApp: **un envío real, que cuesta dinero**.

Requiere Daniel, credenciales, proveedor y dinero.
