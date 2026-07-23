# Mesh Option A — STAGING only (Tailscale → Ollama local)

> **Status:** LOCAL PRIVATE **PASS** · Railway node **WAITING_TS_AUTHKEY** · Prod **OFF** · 2026-07-23 · Coste **0**  
> Evidencia local: `.release-logs/mesh-option-a-local-prep-20260723.txt`  
> ADR-042 · Related: `ARCHITECTURE_LOCAL_AI_RUNTIME.md` · `CANARY_IA_FLAGS.md`

## Scope (CEO-approved)

| Allow | Deny |
|-------|------|
| Staging `ideal-victory` only | Production `@nelvyon/web` |
| Tailscale private overlay | Funnel · Serve · exit node · subnet routing |
| Ollama on Tailscale IP only | Public `0.0.0.0` bind · ngrok · open CF tunnel |
| Open-weight 3b/8b | OpenAI · OpenClaw · payouts · campañas |

## Current verified PC state

| Check | Result |
|-------|--------|
| Tailscale online | yes (host `Nelvyon`) |
| Ollama listen | **Tailscale IPv4 only** (not loopback, not public any) |
| `/api/tags` via Tailscale IP | **PASS** · timeout 5s · models include 3b+8b |
| peer_count | **0** until Railway joins |
| Prod IA flags | **ABSENT** |

> Exact Tailscale IP is **not** committed to git. Read live with:  
> `"C:\Program Files\Tailscale\tailscale.exe" ip -4`

## Manual CEO clicks (auth key — never paste into chat)

### 1) Create ephemeral auth key

1. Browser → [https://login.tailscale.com/admin/settings/keys](https://login.tailscale.com/admin/settings/keys)  
2. Click **Generate auth key…**  
3. Set: **Reusable** = OFF · **Ephemeral** = ON · **Pre-approved** = ON (if shown)  
4. Tags (if ACL tags enabled): `tag:nelvyon-staging`  
5. Click **Generate key**  
6. **Copy once** — do not send to Cursor/chat/Slack  

### 2) Paste key only into Railway STAGING

1. [https://railway.app](https://railway.app) → project **truthful-respect**  
2. Environment switcher → **staging** (not production)  
3. Service **ideal-victory** → **Variables**  
4. **Add variable** → name `TS_AUTHKEY` → paste key → **Add**  
5. Confirm also set (names only):  
   - `NELVYON_MESH_OPTION_A=1`  
   - `OLLAMA_HOST=http://<tailscale-ipv4>:11434` (from `tailscale ip -4`)  
   - `OLLAMA_CONFIGURED=1`  
   - `NELVYON_AI_ENABLED=1` (staging only, after key + redeploy)  
   - `AUTONOMOUS_ALLOW_OPENAI=0`  
6. Redeploy **ideal-victory** once (staging). Entrypoint joins tailnet when `TS_AUTHKEY` present.

### 3) ACL (optional but recommended)

1. [https://login.tailscale.com/admin/acls](https://login.tailscale.com/admin/acls)  
2. Allow `tag:nelvyon-staging` → CEO device :11434 only  
3. **Do not** enable Funnel / exit nodes / subnet routers in UI

## Local verify (PC)

```powershell
node scripts/mesh-option-a-local-prep.mjs
# exit 0 = ALL_PASS (peer present)
# exit 2 = LOCAL_PRIVATE_PASS_WAITING_RAILWAY_NODE
```

## Health / timeout / rollback

| Item | Value |
|------|-------|
| Probe | `GET {OLLAMA_HOST}/api/tags` |
| Timeout | **5000 ms** (`probeOllamaHealth`) |
| Host allowlist | Tailscale CGNAT `100.64/10` or `*.ts.net` only |
| Rollback staging | unset `TS_AUTHKEY` · `NELVYON_MESH_OPTION_A=0` · `NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0` · unset `OLLAMA_HOST` · redeploy staging |
| Rollback PC Ollama | set User env `OLLAMA_HOST=127.0.0.1:11434` · relaunch Ollama |

## Tenant isolation

- Pack / Private AI paths require `tenant_id` / SaaS JWT context (unchanged).  
- Mesh only moves **network path** to Ollama; does not bypass RLS or JWT.  
- Regression: existing SaaS UUID / Private AI tenant tests remain mandatory before claiming soak.

## Forbidden UI (do not click)

- Tailscale Admin → **DNS** → Enable HTTPS / Funnel  
- Machine → **Use as exit node**  
- **Subnet routes** advertise  
- Railway **production** Variables for `TS_AUTHKEY` / mesh flags  
