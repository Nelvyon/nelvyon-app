-- NELVYON social media scheduler

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL,
    platform TEXT NOT NULL
        CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'tiktok')),
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    avatar_url TEXT,
    oauth_token TEXT NOT NULL,
    oauth_token_secret TEXT,
    token_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'disconnected')),
    follower_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, platform, account_id)
);

CREATE INDEX IF NOT EXISTS social_accounts_tenant_idx
    ON social_accounts (tenant_id, platform);

CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    platform_post_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
    account_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    post_type TEXT NOT NULL DEFAULT 'text'
        CHECK (post_type IN ('text', 'image', 'video', 'carousel')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'pending_auth')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_posts_tenant_status_scheduled_idx
    ON social_posts (tenant_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS social_posts_tenant_created_idx
    ON social_posts (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS social_post_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES social_posts (id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS social_post_analytics_post_platform_uidx
    ON social_post_analytics (post_id, platform);

CREATE INDEX IF NOT EXISTS social_post_analytics_post_idx
    ON social_post_analytics (post_id, platform);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_accounts_tenant ON social_accounts;
CREATE POLICY social_accounts_tenant ON social_accounts
    FOR ALL USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS social_posts_tenant ON social_posts;
CREATE POLICY social_posts_tenant ON social_posts
    FOR ALL USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS social_post_analytics_tenant ON social_post_analytics;
CREATE POLICY social_post_analytics_tenant ON social_post_analytics
    FOR ALL USING (
        post_id IN (SELECT id FROM social_posts WHERE tenant_id = current_tenant_id())
    )
    WITH CHECK (
        post_id IN (SELECT id FROM social_posts WHERE tenant_id = current_tenant_id())
    );
