# DNS — app.nelvyon.com (CEO human step)

> Railway domain **ACTIVE** on `@nelvyon/web` · pending Cloudflare DNS  
> Log: `.release-logs/dns-app-nelvyon-20260722.txt`

## Añadir en Cloudflare Dashboard → DNS → Records (zona `nelvyon.com`)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| **CNAME** | `app` | `uzrknbzy.up.railway.app` | **DNS only** (grey cloud) |
| **TXT** | `_railway-verify.app` | `railway-verify=4d95cce7c6810f22fb13ed3110049ad03b726ec68e23d030c2b83cd202b82929` | — |

No borrar otros registros. No MFA bypass vía API (no hay token Cloudflare en esta sesión).

## Verificar después

```text
https://app.nelvyon.com/api/health/live
https://app.nelvyon.com/api/health/ready
```

Esperado: HTTP 200 + `git_sha` del tip vivo.
