-- SES bounce/complaint suppression list (do not resend to these addresses)

CREATE TABLE IF NOT EXISTS ses_suppressions (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL CHECK (reason IN ('bounce', 'complaint')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ses_suppressions_email_idx ON ses_suppressions (lower(email));
