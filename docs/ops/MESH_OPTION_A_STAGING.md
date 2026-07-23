# Mesh Option A — STAGING only (Tailscale → Ollama local)

> **Status 2026-07-23 (tip `1d5d620a`):** LOCAL PRIVATE **PASS** · Deploy `03a16532` **SUCCESS** · live/ready **200** · Tailscale join **FAIL** (`MESH_JOIN_FAIL` · ephemeral `TS_AUTHKEY` invalid/consumed) · Pack E2E **WARN** (critical=0 · not mesh-proven) · Prod IA **ABSENT** · Coste **0** · `claimReady: false`  
> ADR-042 · ADR-043 · ADR-044 · Evidence: Railway logs `MESH_JOIN_FAIL` / `invalid key` · peer offline  

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
| Tip SHA live | `1d5d620ab4e9` · deploy `03a16532` SUCCESS |
| Code (ADR-044) | CGNAT allowlist · HTTP proxy fetch · entrypoint `mesh_ok` · vitest 44/44 |
| Ollama listen | Tailscale IPv4 **only** (loopback closed) |
| Ollama private `/api/tags` | **PASS** |
| Staging `live` / `ready` | **200** |
| Staging Tailscale join | **FAIL** — ephemeral auth key rejected/consumed on redeploy |
| Staging peer | `nelvyon-staging-web*` **offline** |
| Staging AI flags | AI=1 · OLLAMA_CONFIGURED=1 · MESH=1 · OpenAI=0 · Router=1 · QR=1 |
| Prod IA/mesh keys | **ABSENT** |
| Pack E2E | **WARN_FAIL** critical=0 · 1 WARN portal download 404 · **not** mesh path proven |
| Unit tests | **44/44 PASS** |

## Emergency rollback (exactly two flags → 0)

On Railway **staging** / `ideal-victory` → Variables:

1. `NELVYON_AI_ENABLED` = `0`  
2. `OLLAMA_CONFIGURED` = `0`  

Then redeploy staging (or wait for restart). This fail-closes IA immediately without touching production.

Optional cleanup: unset `TS_AUTHKEY` · set `NELVYON_MESH_OPTION_A=0`.

## Fix required (CEO — do not paste key in chat)

`TS_AUTHKEY` ephemeral is **single-use**. Every successful `tailscale up` / redeploy that joins consumes it → next redeploy needs a **new** key.

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
6. On PC: `"C:\Program Files\Tailscale\tailscale.exe" status` → `nelvyon-staging-web*` **online**

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
| Proxies | Set **only** after successful `tailscale up` (`mesh_ok=1`) |
| Proxy fetch | HTTP absolute-form via Node `http` (ADR-044) |

## Tenant isolation

Mesh does not bypass JWT/RLS. Pack/Private AI still require `tenant_id`.

## Forbidden UI

Funnel · Serve · exit node · subnet routes · any mesh vars on **production**.
