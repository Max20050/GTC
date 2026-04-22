-- Migration: OAuth accounts table + allow password-less users (OAuth-only)

-- OAuth users have no local password; make the column nullable.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Links a user to one or more external OAuth providers.
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider    VARCHAR(50)  NOT NULL,   -- e.g. 'google', 'github'
    provider_id VARCHAR(255) NOT NULL,   -- the user's unique ID on the provider
    email       VARCHAR(255),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT uq_oauth_provider UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
