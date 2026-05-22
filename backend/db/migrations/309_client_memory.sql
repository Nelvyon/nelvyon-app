-- Client persistent memory (pgvector) for agent context across sessions
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS client_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL,
    client_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_memory_embedding_idx
ON client_memory USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS client_memory_workspace_idx
ON client_memory (workspace_id, client_id);
