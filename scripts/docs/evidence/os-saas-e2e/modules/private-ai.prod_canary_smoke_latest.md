# Private AI production canary smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-27T17:39:06.985Z |
| Base | https://app.nelvyon.com |
| Verdict | **FAIL** |
| OpenAI | must remain OFF |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| health.live | PASS | sha=? |
| health.ready | PASS | "ok" |
| A.register | PASS | pai-canary-A-de19d910@nelvyon.test |
| A.onboard | PASS | 7a432dab-5856-4540-bd33-9aba82bfe5d0 |
| B.register | PASS | pai-canary-B-a5a91bd5@nelvyon.test |
| B.onboard | PASS | 1d33bf2c-e226-4c26-a78e-195635dde61d |
| router.health | PASS | {"certified":true,"declaration":"ROUTER DE MODELOS NELVYON COMPLETADO","health":{"ok":true,"privateMode":true,"postgres":true,"ollama":true,"fastModelAvailable":true,"strategyModelAvailable":true,"loa |
| status.ok_no_openai_egress | PASS | {"enabled":false,"privateAiOnly":true,"privateMode":{"privateMode":true,"internetTaskAuthorized":false,"internetUntil":null,"allowedHosts":["127.0.0.1","localhost","::1","host.docker.internal","10.0.0 |
| router.route | PASS | {"mode":"route","decision":{"taskId":"af911412-b0aa-4559-9e13-9dc7bc6ea046","taskType":"knowledge","risk":"low","blocked":false,"requiresApproval":false,"model":{"slot":"fast","model":"llama3.2:3b-instruct-q4_K_M","numCt |
| inference.A | FAIL | HTTP 500 {"error":"Internal error"} |
| logs.audit.A | PASS | {"items":[]} |
| isolation.B_status | PASS | no A tenant id in B payload |
| auth.required | PASS | HTTP 401 |
