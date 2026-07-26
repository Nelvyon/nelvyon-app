# Email + PDF locale — PARTIAL inventory (honest)

> Fecha: 2026-07-26 · **No** claim FULL_VERIFIED · textos legales/fiscales → revisión humana

## Wired (es/en/fr/de/it/pt) — `backend/email/localeCopy.ts`

| Template | Status |
|----------|--------|
| welcome | LOCALIZED |
| passwordReset | LOCALIZED |
| invoice (Resend path) | LOCALIZED |
| jobCompleted | LOCALIZED |
| onboardingComplete | LOCALIZED |
| SES `payment_failed` | LOCALIZED |
| SES `cancellation` | LOCALIZED |

## Still Spanish-only (PARTIAL gap)

### SES catalog (`backend/email/templates.ts`)

- email_verify
- plan_activated
- invoice (SES legacy path subjects still ES where not wired to localeCopy)
- data_export_confirm
- account_deleted
- nps_thank_you

### Billing lifecycle (`backend/billing/*EmailTemplates.ts`)

- paymentFailedEmail (billing module duplicate ES)
- secondNoticeEmail
- finalWarningEmail
- suspensionEmail
- reactivationEmail
- cancellationScheduledEmail
- offboardingEmail

### PDF (`backend/saas/pdfLocaleLabels.ts`)

- Label chrome: LOCALIZED es/en/fr/de/it/pt
- Full legal/tax body copy: **HUMAN_REVIEW_REQUIRED** (not machine-translated)

## Regressions

- `LocalizationCore.test.ts` — key parity + currency/timezone + saas.audit anti-EN-clone
- Do not promote email/PDF to FULL_VERIFIED until this inventory is empty + legal review
