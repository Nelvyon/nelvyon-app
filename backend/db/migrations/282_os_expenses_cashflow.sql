-- Fase 2F: gastos operativos y flujo de caja NELVYON OS

CREATE TABLE IF NOT EXISTS os_expenses (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    workspace_id INTEGER,
    title VARCHAR NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR NOT NULL DEFAULT 'EUR',
    status VARCHAR NOT NULL DEFAULT 'pendiente',
    category VARCHAR,
    vendor VARCHAR,
    expense_date VARCHAR,
    paid_at VARCHAR,
    client_id INTEGER,
    project_id INTEGER,
    assignee VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_os_expenses_workspace ON os_expenses (workspace_id);
CREATE INDEX IF NOT EXISTS ix_os_expenses_ws_status ON os_expenses (workspace_id, status);
CREATE INDEX IF NOT EXISTS ix_os_expenses_ws_date ON os_expenses (workspace_id, expense_date);

CREATE TABLE IF NOT EXISTS os_cashflow (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    workspace_id INTEGER,
    direction VARCHAR NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR NOT NULL DEFAULT 'EUR',
    flow_date VARCHAR,
    source_type VARCHAR NOT NULL DEFAULT 'manual',
    source_id INTEGER,
    category VARCHAR,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_os_cashflow_workspace ON os_cashflow (workspace_id);
CREATE INDEX IF NOT EXISTS ix_os_cashflow_ws_dir ON os_cashflow (workspace_id, direction);
CREATE INDEX IF NOT EXISTS ix_os_cashflow_ws_source ON os_cashflow (workspace_id, source_type, source_id);
