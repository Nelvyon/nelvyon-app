# Mesh Option A — STAGING only (Tailscale → Ollama local)

> **Status 2026-07-23:** LOCAL PRIVATE **PASS** · Staging container live/ready **200** · Tailscale join **FAIL** (`TS_AUTHKEY` invalid) · Prod IA **ABSENT** · Coste **0** · `claimReady: false`  
> ADR-042 · Evidence: Railway logs `MESH_JOIN_FAIL` / `invalid key` · peer `nelvyon-staging-web` offline  

## Scope (CEO-approved)

| Allow | Deny |
|-------|------|
| Staging `ideal-victory` only | Production `@nelvyon/web` |
| Tailscale private overlay | Funnel · Serve · exit node · subnet routing |
| Ollama on Tailscale IP only | Public `0.0.0.0` bind · ngrok · open CF tunnel |
| Open-weight 3b/8b | OpenAI · OpenClaw · payouts · campañas |

## Verification matrix (this pass)

| Check | Result |
|-------|--------|
| Ollama listen | Tailscale IPv4 **only** (loopback closed) |
| Ollama private `/api/tags` | **PASS** |
| Staging `live` / `ready` | **200** · `git_sha=bf9b24d1d4c5` |
| Staging Tailscale join | **FAIL** — auth key rejected by Tailscale control plane |
| Staging peer | `nelvyon-staging-web` seen then **offline** |
| Staging AI flags | AI=1 · OLLAMA_CONFIGURED=1 · MESH=1 · OpenAI=0 · Router=1 · QR=1 |
| Prod IA/mesh keys | **ABSENT** |
| Pack E2E / Router remote | **BLOCKED** until valid `TS_AUTHKEY` + `MESH_JOIN_OK` |
| Tenant isolation unit | **PASS** (localAiModelRouter 25/25) |

## Emergency rollback (exactly two flags → 0)

On Railway **staging** / `ideal-victory` → Variables:

1. `NELVYON_AI_ENABLED` = `0`  
2. `OLLAMA_CONFIGURED` = `0`  

Then redeploy staging (or wait for restart). This fail-closes IA immediately without touching production.

Optional cleanup: unset `TS_AUTHKEY` · set `NELVYON_MESH_OPTION_A=0`.

## Fix required (CEO — do not paste key in chat)

Current `TS_AUTHKEY` was **rejected** (`invalid key`). Ephemeral keys are single-use / expire.

### Regenerate

1. [https://login.tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys)  
2. **Generate auth key…** → Reusable **OFF** · Ephemeral **ON** · Pre-approved **ON**  
3. Prefer key that starts with `tskey-auth-`  
4. **Generate key** → copy once  

### Replace on Railway staging only

1. Railway → **truthful-respect** → env **staging** → **ideal-victory** → **Variables**  
2. Edit `TS_AUTHKEY` → paste new key → save  
3. Confirm `NELVYON_MESH_OPTION_A=1` · `OLLAMA_HOST=http://<tailscale-ipv4>:11434` · `OLLAMA_CONFIGURED=1` · `NELVYON_AI_ENABLED=1` · `AUTONOMOUS_ALLOW_OPENAI=0`  
4. **Redeploy** `ideal-victory` once  
5. Confirm logs show **`MESH_JOIN_OK`** (not `MESH_JOIN_FAIL`)  
6. On PC: `"C:\Program Files\Tailscale\tailscale.exe" status` → `nelvyon-staging-web` **online**

## Local verify (PC)

```powershell
node scripts/mesh-option-a-local-prep.mjs
# exit 0 = peer online · exit 2 = waiting railway node
```

## Health / timeout

| Item | Value |
|------|-------|
| Probe | `GET {OLLAMA_HOST}/api/tags` |
| Timeout | **5000 ms** |
| Host allowlist | Tailscale CGNAT `100.64/10` or `*.ts.net` |
| Proxies | Set **only** after successful `tailscale up` |

## Tenant isolation

Mesh does not bypass JWT/RLS. Pack/Private AI still require `tenant_id`.

## Forbidden UI

Funnel · Serve · exit node · subnet routes · any mesh vars on **production**.
