# Cloudflare WAF — NELVYON (MIG 281)

Configurar manualmente en el dashboard de Cloudflare el día del deploy, cuando `nelvyon.com` apunte a Cloudflare (delante de Railway).

## Reglas WAF

### Regla 1 — Bloquear bots maliciosos

- **Expression:** `(cf.client.bot) and not (cf.verified_bot_category in {"Search Engine Crawlers"})`
- **Action:** Block

### Regla 2 — Rate limit global por IP en API

- **Path:** `/api/*`
- **Rate:** 10 requests / 10 seconds per IP
- **Action:** Challenge (CAPTCHA)

### Regla 3 — Países de alto riesgo (opcional)

Activar solo si hay ataques dirigidos a la API.

- **Expression:** `ip.geoip.country in {"KP" "IR" "RU" "CN"} and http.request.uri.path contains "/api/"`
- **Action:** Challenge

### Regla 4 — Proteger webhook Paddle

Restringir `POST /api/webhooks/paddle` a IPs oficiales de Paddle.

- **Path:** `/api/webhooks/paddle`
- **Allow IPs:** `34.232.58.13`, `34.195.105.136`, `34.237.3.244`
- **Action:** Block si la IP no coincide

**Nota aplicación:** En Next.js, la ruta del webhook **no recibe CSP** (ver `next.config.ts`). La autenticidad del evento se valida con **firma HMAC** (`paddle-signature`) en `apps/web/src/app/api/webhooks/paddle/route.ts` (MIG 256). Cloudflare no debe alterar el body del webhook; desactivar transformaciones en esa ruta si aplica.

### Regla 5 — Bot Fight Mode

- **Setting:** ON

### Regla 6 — HTTPS Always

- **Setting:** ON (Always Use HTTPS)

### Regla 7 — TLS

- **Minimum TLS:** 1.2
- **TLS 1.3:** ON

## Headers en origen (Railway / Next.js)

Los headers de seguridad (CSP, HSTS, etc.) se envían desde `apps/web/next.config.ts`. Cloudflare puede añadir capas extra; evitar duplicar HSTS en ambos lados con valores conflictivos.

## Checklist deploy

1. DNS en Hostinger → Cloudflare (proxy naranja).
2. Origin: Railway URL como CNAME/A record.
3. Aplicar reglas 1–7.
4. Verificar checkout Paddle y PostHog en staging.
5. Probar webhook Paddle desde dashboard (evento de prueba).
