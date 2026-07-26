# Private AI production canary smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T17:29:34.145Z |
| Base | https://app.nelvyon.com |
| Verdict | **FAIL** |
| OpenAI | must remain OFF |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| health.live | PASS | sha=5064f1c14ab3 |
| health.ready | PASS | "ok" |
| A.register | PASS | pai-canary-A-d0bac476@nelvyon.test |
| A.onboard | PASS | b45aa11a-5718-4531-b333-dd022c7e1167 |
| B.register | PASS | pai-canary-B-5bc47908@nelvyon.test |
| B.onboard | PASS | 4609a95b-ed0c-41fc-98d1-85fdf136f3aa |
| router.health | FAIL | HTTP 404 {"raw":"<!DOCTYPE html><html lang=\"es\" class=\"scroll-smooth\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1\"/><link rel=\"st |
| status.no_openai | FAIL | {"enabled":true,"privateAiOnly":true,"privateMode":{"privateMode":true,"internetTaskAuthorized":false,"internetUntil":null,"allowedHosts":["127.0.0.1","localhost","::1","host.docker.internal","10.0.0. |
| router.route | FAIL | HTTP 404 {"raw":"<!DOCTYPE html><html lang=\"es\" class=\"scroll-smooth\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1\"/><link rel=\"stylesheet\" href=\"/_ |
| inference.A | FAIL | HTTP 404 {"raw":"<!DOCTYPE html><html lang=\"es\" class=\"scroll-smooth\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1\"/><link rel=\"stylesheet\" href=\"/_next/static/css/ccf9becfd1d3f51e.css\" dat"} |
| isolation.B_status | PASS | no A tenant id in B payload |
| auth.required | PASS | HTTP 401 |
