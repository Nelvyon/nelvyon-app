# Private AI production canary smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T18:09:35.924Z |
| Base | https://app.nelvyon.com |
| Verdict | **FAIL** |
| OpenAI | must remain OFF |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| health.live | PASS | sha=8856d5dc1e63 |
| health.ready | PASS | "ok" |
| A.register | PASS | pai-canary-A-d3b7c284@nelvyon.test |
| A.onboard | PASS | 252c4980-dc0d-4cde-b586-7d0fcd761b10 |
| B.register | PASS | pai-canary-B-15ab35ee@nelvyon.test |
| B.onboard | PASS | 528f5347-dda4-470d-85b7-abe5f99c1c09 |
| router.health | FAIL | HTTP 404 {"raw":"<!DOCTYPE html><html lang=\"es\" class=\"scroll-smooth\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1\"/><link rel=\"st |
| status.ok_no_openai_egress | PASS | {"enabled":true,"privateAiOnly":true,"privateMode":{"privateMode":true,"internetTaskAuthorized":false,"internetUntil":null,"allowedHosts":["127.0.0.1","localhost","::1","host.docker.internal","10.0.0. |
| router.route | FAIL | HTTP 404 {"raw":"<!DOCTYPE html><html lang=\"es\" class=\"scroll-smooth\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1\"/><link rel=\"stylesheet\" href=\"/_ |
| inference.A | FAIL | HTTP 404 {"raw":"<!DOCTYPE html><html lang=\"es\" class=\"scroll-smooth\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1\"/><link rel=\"stylesheet\" href=\"/_next/static/css/ccf9becfd1d3f51e.css\" dat"} |
| isolation.B_status | PASS | no A tenant id in B payload |
| auth.required | PASS | HTTP 401 |
