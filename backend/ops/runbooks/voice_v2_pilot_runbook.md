# VOZ NELVYON v2 Pilot Runbook

## Scope Freeze (Current State)
- Front status: **VOZ NELVYON v2 pilot closed in PASA real**.
- Keep active scope exactly as shipped:
  - `/app/voz` governance + monthly quota snapshot
  - `/app/voz/inbound` voice note inbound -> ticket
  - `/app/voz/outbound-synth` short text -> local browser audio
- Out of scope until a new explicit front is opened:
  - Twilio/CCaaS
  - paid TTS/STT providers
  - call center automation, IVR, campaign dialers

## Environment Variables

### Plan Gating
- `VOICE_V1_PLAN_IDS`
  - Server-side allowlist (comma-separated `plan_id` values).
  - Example: `VOICE_V1_PLAN_IDS=starter,pro`
  - If empty or unset, server pilot access is denied.
- `NEXT_PUBLIC_VOICE_V1_PLAN_IDS`
  - Existing web-side allowlist signal (v1/v2 UI messaging and gating consistency).
  - Keep aligned with `VOICE_V1_PLAN_IDS` to avoid mixed UX.

### Monthly Pilot Quota
- `VOICE_V2_PILOT_MONTHLY_ACTION_CAP`
  - Hard cap per workspace/month across pilot actions.
  - Default: `30`
  - Recommended pilot range: `20-50`
  - Used for inbound uploads and synth consumes.

### Inbound Audio Storage
- `VOICE_V2_PILOT_STORAGE_DIR`
  - Filesystem root for inbound audio blobs.
  - If unset, fallback path is used under backend data directory.
  - Example (Windows): `VOICE_V2_PILOT_STORAGE_DIR=C:\nelvyon\data\voice_pilot_v2`
  - Ensure the backend process has read/write permissions.

### Inbound Size Guard
- `VOICE_V2_INBOUND_MAX_BYTES`
  - Max inbound upload size in bytes.
  - Default currently aligned to 5 MiB.
  - Example: `VOICE_V2_INBOUND_MAX_BYTES=5242880`

## Operational Checks

### 1) Gating Check
- Confirm workspace `plan_id` is in allowlist.
- Open `/app/voz` and verify governance block:
  - `plan_allowed=true`
  - `actions_remaining > 0` for active usage.

### 2) Inbound Flow Check
- Open `/app/voz/inbound`.
- Upload short audio or record <= 60s.
- Expected:
  - ticket is created
  - inbound row is created
  - audio preview/download works in workspace scope.

### 3) Outbound Synth Check
- Open `/app/voz/outbound-synth`.
- Enter short text (<= configured UI limit) and generate listen.
- Expected:
  - browser local speech plays
  - quota counters move as expected.

## Monthly Quota Behavior
- Quota is workspace-scoped and month-scoped.
- When exhausted:
  - UI must show clear "pilot monthly limit reached"
  - API must return controlled quota-block response
  - no hidden retries or silent failures.

## Troubleshooting
- Pilot blocked unexpectedly:
  - verify `VOICE_V1_PLAN_IDS` value and spacing
  - verify active workspace subscription `plan_id`.
- Upload fails:
  - check `VOICE_V2_INBOUND_MAX_BYTES`
  - check MIME/content type and storage directory permissions.
- Inconsistent UI vs API gating:
  - align `NEXT_PUBLIC_VOICE_V1_PLAN_IDS` with `VOICE_V1_PLAN_IDS`.

## Change Policy
- Do not expand voice scope from this runbook.
- Next changes must be opened as a new single front (explicitly approved), preserving baseline and closed fronts.
