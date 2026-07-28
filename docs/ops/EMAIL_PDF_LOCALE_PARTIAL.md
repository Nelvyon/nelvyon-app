# Email + PDF locale — PARTIAL inventory (honest)

> Fecha: 2026-07-28 · **No** claim FULL_VERIFIED · textos legales/fiscales PDF → revisión humana

## Wired (es/en/fr/de/it/pt) — `backend/email/localeCopy.ts`

| Template | Path | Status |
|----------|------|--------|
| welcome | Resend + SES | LOCALIZED |
| passwordReset | Resend + SES | LOCALIZED |
| invoice | Resend + SES | LOCALIZED |
| jobCompleted | Resend | LOCALIZED |
| onboardingComplete | Resend | LOCALIZED |
| SES `email_verify` | `templates.ts` | LOCALIZED |
| SES `plan_activated` | `templates.ts` | LOCALIZED |
| SES `payment_failed` | `templates.ts` | LOCALIZED |
| SES `cancellation` | `templates.ts` | LOCALIZED |
| SES `data_export_confirm` | `templates.ts` | LOCALIZED |
| SES `account_deleted` | `templates.ts` | LOCALIZED |
| SES `nps_thank_you` | `templates.ts` | LOCALIZED |
| SES/Resend chrome (`lang` + footer rights/legal) | `templates.ts` / `_base.ts` | LOCALIZED |

## Wired (es/en/fr/de/it/pt) — `backend/billing/billingLifecycleLocale.ts`

| Template | Status |
|----------|--------|
| paymentFailedEmail | LOCALIZED |
| secondNoticeEmail | LOCALIZED |
| finalWarningEmail | LOCALIZED |
| suspensionEmail | LOCALIZED |
| reactivationEmail | LOCALIZED |
| cancellationScheduledEmail | LOCALIZED |
| offboardingEmail | LOCALIZED |

## Runtime plumbing (2026-07-28)

- `emailService.sendEmail(template, params, locale?)` — optional locale (default `es`)
- `resolveUserEmailLocale(db, userId)` — from `saas_client_profiles.language`
- Wired callers: Stripe/Paddle webhooks, onboarding welcome, email verify, password reset, NPS thank-you, GDPR deletion, data export confirm, dunning + cancellation services

## Still PARTIAL (honest gaps)

### PDF (`backend/saas/pdfLocaleLabels.ts`)

- Label chrome: LOCALIZED es/en/fr/de/it/pt
- Full legal/tax body copy: **HUMAN_REVIEW_REQUIRED** (not machine-translated)

### Ops / product

- Mass-send campaigns: **BLOCKED_LEGAL** (Pepito / campaign legal gate)
- Live Stripe tax/refund edge cases: require ops + real Stripe events (tests cover synthetic paths)

## Regressions

- `backend/email/__tests__/nelvyonEmail.test.ts`
- `backend/billing/__tests__/billingLifecycleLocale.test.ts`
- `LocalizationCore.test.ts` — UI key parity (email/PDF remain PARTIAL in catalog notes)

Do not promote email/PDF to FULL_VERIFIED until PDF legal review is complete.
