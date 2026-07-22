# DNS — app.nelvyon.com

> **VERIFIED 2026-07-22** · Railway ownership + Let's Encrypt cert · live/ready **200**  
> Evidence: `.release-logs/dns-app-verify-pass-20260722.txt`

## Records (Cloudflare · DNS only)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| **CNAME** | `app` | `uzrknbzy.up.railway.app` | DNS only |
| **TXT** | `_railway-verify.app` | `railway-verify=4d95cce7c6810f22fb13ed3110049ad03b726ec68e23d030c2b83cd202b82929` | — |

## Verification results

| Check | Result |
|-------|--------|
| Public DNS CNAME | PROPAGATED → `uzrknbzy.up.railway.app` |
| TXT verify | Present |
| Railway `verification.verified` | **true** |
| Certificate | **VALID** · CN=`app.nelvyon.com` · LE · expires 2026-10-20 |
| `GET /api/health/live` | **200** `git_sha=e62d52cc5d61` |
| `GET /api/health/ready` | **200** db/auth/env ok |

```text
https://app.nelvyon.com/api/health/live
https://app.nelvyon.com/api/health/ready
```

## CSRF note

Mutations cookie SaaS must allow Origin `https://app.nelvyon.com` (see `assertSaasOrigin` prod host defaults + `scripts/staging-smoke-ki020-csrf.mjs`).
