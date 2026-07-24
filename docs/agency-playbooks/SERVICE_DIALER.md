# SERVICE — Dialer / Telephony

> Capability: `telephony_core` · Core: `backend/agency/TelephonyCore.ts` · Team: `svc_automations_crm`
> Flag: none required for the simulator (always available) · real provider: permanently `BLOCKED_EXTERNAL`
> Catálogo OS v1.3

## Primary

Canonical dialer domain model — contact consent/opt-out, call queue, campaigns (draft-only),
recording metadata, rate limits, CRM timeline stubs, audit log — backed by exactly ONE working
provider: `SimulatorTelephonyProvider` (in-memory, synthetic-only, never touches a network socket).

## Estado

- **Core: VERIFIED (simulator).** `SimulatorTelephonyProvider` implements the full
  `TelephonyProvider` contract (`enqueueCall`, `startCall`, `endCall`, `getRecordingMeta`,
  `optOutCheck`) with tenant isolation, opt-out enforcement, and rate-limit metadata.
- **Real calls: `BLOCKED_EXTERNAL`, permanently.** `TwilioTelephonyProvider`'s constructor
  ALWAYS throws `BLOCKED_EXTERNAL` — it can never be instantiated. There is no environment
  flag that flips this. Going live with a real provider requires a manual code rewrite of
  that class after `docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md` is completed — never a
  runtime toggle, input parameter, or config value.
- This core does **not** call `backend/integrations/TwilioService.ts` or any other existing
  Twilio integration in this repo — it is fully independent so nothing here can accidentally
  wire into a live dial path.

## Modelo canónico

- `ContactConsent` — opt-in/opt-out/unknown per tenant + phone, with source + timestamp.
- `CallQueueItem` — queued → in_progress → completed/failed, or blocked_opt_out /
  blocked_rate_limit at enqueue time.
- `CallCampaign` — always created with `status: "draft"`. There is no "launch to live" path
  in this core.
- `RecordingConfig` — `enabled: false` by default; must be explicitly turned on per campaign.
- `AuditEntry` — every consent change, enqueue, block, start, and end is audited per tenant.
- CRM timeline stubs (`call_queued` / `call_started` / `call_ended` / `call_blocked`) — in-memory
  only, ready to be persisted by a real CRM integration later.

## Transcripción local

`isCallTranscriptionEnabled()` reads `NELVYON_CALL_TRANSCRIPTION_ENABLED` (default `0`/unset).
Regardless of this flag's value, `getRecordingMeta()` always returns
`transcriptionStatus: "prepared_off"` — no transcription pipeline exists yet; the flag is
reserved for a future, separately-reviewed implementation.

## QA / evidencia

Tests: `backend/agency/__tests__/TelephonyCore.test.ts` — tenant isolation, opt-out block,
rate limit, recording defaults, and the `assertTelephonyRealProviderDisabled()` proof that
real-provider construction always fails.

## Forbidden

Real outbound/inbound calls of any kind · constructing `TwilioTelephonyProvider` · recording
enabled by default · transcription of real audio · campaigns with any status other than
`draft` · Pepito DB as a contact source.

## Próximo paso EXACTO

1. **CEO:** complete `docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md` (Twilio account, numbers,
   compliance/consent review) before any real-provider work is scheduled.
2. Until then: simulator only, no code changes to unblock `TwilioTelephonyProvider`.
