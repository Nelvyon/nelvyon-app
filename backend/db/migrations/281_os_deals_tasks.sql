-- Fase 2C: pipeline y tareas internas NELVYON OS (no crm_deals / saas_*)

CREATE TABLE IF NOT EXISTS os_deals (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    workspace_id INTEGER,
    title VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'nuevo',
    client_id INTEGER,
    project_id INTEGER,
    estimated_value NUMERIC(14, 2),
    assignee VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_os_deals_workspace ON os_deals (workspace_id);
CREATE INDEX IF NOT EXISTS ix_os_deals_ws_status ON os_deals (workspace_id, status);
CREATE INDEX IF NOT EXISTS ix_os_deals_ws_client ON os_deals (workspace_id, client_id);
CREATE INDEX IF NOT EXISTS ix_os_deals_ws_project ON os_deals (workspace_id, project_id);

CREATE TABLE IF NOT EXISTS os_tasks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    workspace_id INTEGER,
    title VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR NOT NULL DEFAULT 'pendiente',
    priority VARCHAR DEFAULT 'media',
    due_date VARCHAR,
    client_id INTEGER,
    project_id INTEGER,
    assignee VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_os_tasks_workspace ON os_tasks (workspace_id);
CREATE INDEX IF NOT EXISTS ix_os_tasks_ws_status ON os_tasks (workspace_id, status);
CREATE INDEX IF NOT EXISTS ix_os_tasks_ws_client ON os_tasks (workspace_id, client_id);
CREATE INDEX IF NOT EXISTS ix_os_tasks_ws_project ON os_tasks (workspace_id, project_id);
CREATE INDEX IF NOT EXISTS ix_os_tasks_ws_due ON os_tasks (workspace_id, due_date);
