# Private AI prod canary — kill after smoke FAIL (dockerignore)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T18:12:00.000Z |
| Tip live during smoke | `8856d5dc` |
| Deploy canary window | `b02ef04a-c868-42bd-92ad-811df5c58e59` SUCCESS + MESH_JOIN_OK |
| Smoke | **FAIL** — router.health / route / inference HTML 404 |
| Root cause | Root `.dockerignore` excluded `inference` / `metrics` / `router-health` from image (middleware 401 without cookie masked absence) |
| Kill | `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1` + canary/AI/OLLAMA_CONFIGURED=0 · vars set ~1.2s |
| Kill deploy | `8bc19fa4-b7fc-4ec8-b8f1-42a3e2e2b180` SUCCESS · live/ready 200 |
| OpenAI | ABSENT / ALLOW=0 |
| claimReady | **false** |

## Smoke snapshot

- PASS: health.live/ready · register/onboard A/B · status (no OpenAI) · isolation.B · auth middleware 401
- FAIL: router-health · inference route/execute (Next HTML 404 — routes not in image)

## Follow-up

Remove private-ai path excludes from `.dockerignore`, redeploy tip, reopen minimal canary, re-smoke, real kill drill.
