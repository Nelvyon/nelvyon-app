# Private AI production canary smoke

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-27T18:20:47.732Z |
| Base | https://app.nelvyon.com |
| Verdict | **ALL_PASS** |
| OpenAI | must remain OFF |

## Checks

| Check | Result | Detail |
|-------|--------|--------|
| health.live | PASS | sha=8c5c27682411 |
| health.ready | PASS | "ok" |
| A.register | PASS | pai-canary-A-57c1b826@nelvyon.test |
| A.onboard | PASS | e52859b1-032a-4741-a210-46de86abffc0 |
| B.register | PASS | pai-canary-B-64b6f68e@nelvyon.test |
| B.onboard | PASS | 0e217bfb-f1c2-45ca-a8d3-7505afe36457 |
| canary.window_ready | PASS | HTTP 200 after readiness wait |
| router.health | PASS | {"certified":true,"declaration":"ROUTER DE MODELOS NELVYON COMPLETADO","health":{"ok":true,"privateMode":true,"postgres":true,"ollama":true,"fastModelAvailable":true,"strategyModelAvailable":true,"loa |
| status.ok_no_openai_egress | PASS | {"enabled":true,"privateAiOnly":true,"privateMode":{"privateMode":true,"internetTaskAuthorized":false,"internetUntil":null,"allowedHosts":["127.0.0.1","localhost","::1","host.docker.internal","10.0.0. |
| router.route | PASS | {"mode":"route","decision":{"taskId":"18879fd8-c315-4f4c-b1ac-77872ad7ae6d","taskType":"knowledge","risk":"low","blocked":false,"requiresApproval":false,"model":{"slot":"fast","model":"llama3.2:3b-instruct-q4_K_M","numCt |
| inference.A | PASS | model=llama3.2:3b-instruct-q4_K_M chars=118 latencyMs=4668 |
| inference.latency | PASS | 4668ms (<=120s soft gate) |
| logs.audit.A | PASS | {"items":[{"id":"6e230f1d-e65a-4e62-8f47-232371c6bbe3","agentId":"router_inference","action":"router_execute","provider":"local_router","model":"llama3.2:3b-instruct-q4_K_M","input |
| isolation.B_status | PASS | no A tenant id in B payload |
| auth.required | PASS | HTTP 401 |
