-- NELVYON Spanish invoicing (IVA, correlativa numbering)

CREATE TABLE IF NOT EXISTS invoice_sequences (
    workspace_id INTEGER NOT NULL,
    series TEXT NOT NULL DEFAULT 'FAC',
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, series, year)
);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    series TEXT NOT NULL DEFAULT 'FAC',
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_nif TEXT,
    client_address TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    iva_rate NUMERIC(5, 2) NOT NULL DEFAULT 21,
    iva_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    pdf_path TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_workspace_number_idx
    ON invoices (workspace_id, invoice_number);

CREATE INDEX IF NOT EXISTS invoices_workspace_status_idx
    ON invoices (workspace_id, status);

CREATE INDEX IF NOT EXISTS invoices_workspace_created_idx
    ON invoices (workspace_id, created_at DESC);
