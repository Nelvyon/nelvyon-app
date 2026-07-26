# Private AI production canary smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T19:07:40.098Z |
| Base | https://app.nelvyon.com |
| Verdict | **FAIL** |
| OpenAI | must remain OFF |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| health.live | PASS | sha=1eaed9f2d859 |
| health.ready | PASS | "ok" |
| A.register | PASS | pai-canary-A-44fd7fc9@nelvyon.test |
| A.onboard | PASS | 070615f2-f2d4-43cb-a9ca-3e682cfce9c4 |
| B.register | PASS | pai-canary-B-283a1e56@nelvyon.test |
| B.onboard | PASS | 686dfb4b-e0b6-40b6-8d50-0466fcda49db |
| router.health | PASS | {"certified":false,"declaration":"ROUTER DE MODELOS NELVYON NO SALUDABLE","health":{"ok":false,"privateMode":true,"postgres":false,"ollama":false,"fastModelAvailable":true,"strategyModelAvailable":tru |
| status.ok_no_openai_egress | PASS | {"enabled":true,"privateAiOnly":true,"privateMode":{"privateMode":true,"internetTaskAuthorized":false,"internetUntil":null,"allowedHosts":["127.0.0.1","localhost","::1","host.docker.internal","10.0.0. |
| router.route | PASS | {"mode":"route","decision":{"taskId":"dea4d22d-b1ba-4c14-b960-c9c1b311571d","taskType":"knowledge","risk":"low","blocked":false,"requiresApproval":false,"model":{"slot":"fast","model":"llama3.2:3b-instruct-q4_K_M","numCt |
| inference.A | FAIL | empty body {"mode":"execute","result":{"taskId":"b7d6e096-5ede-4abc-87ff-1a35d91ddbe0","status":"failed","content":"ERROR: connect ECONNREFUSED 127.0.0.1:5434","blocked":false,"requiresApproval":false,"meta":{"taskId":"b7d6e096-5ede-4abc-87ff-1a35d91d |
| isolation.B_status | PASS | no A tenant id in B payload |
| auth.required | PASS | HTTP 401 |
