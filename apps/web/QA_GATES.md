# NELVYON Web QA Gates (Phase D)

## Scope

Critical user-facing flows covered by smoke and bot eval gates:

- Auth bridge sign-in (`/sign-in`, JWT -> `/api/v1/auth/me`)
- Workspace list/select/create
- Onboarding activation checklist mapping
- CRM client create
- Inbox ticket create
- Campaign bootstrap (`client -> project -> campaign`)
- Help center routes and search
- Help bot v1 (`article` vs `handoff`)

## Gate Commands

Run from `apps/web`:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:smoke`
- `pnpm test:bot-evals`

Combined blocking gate:

- `pnpm gate`

Expanded regression signal:

- `pnpm test:regression`

## Red vs Warning

### Red (block merge/deploy candidate)

- `typecheck` fails
- `lint` fails
- `test:smoke` fails
- `test:bot-evals` fails

### Warning (investigate, does not auto-block)

- `test:regression` fails in non-critical areas while smoke + bot-evals are green
- low-confidence bot responses that still route to correct help form/article path

## Bot Eval Acceptance

Current fixture set enforces:

- Known FAQ/how-to questions -> `article`
- Bug reports -> `handoff_bug`
- Product feedback -> `handoff_feedback`
- Ambiguous/unknown -> `handoff_help`

Release acceptance baseline:

- 100% fixture pass in `src/features/helpbot/__tests__/fixtures.ts`
- Any fixture regression is a red failure for release candidate.
