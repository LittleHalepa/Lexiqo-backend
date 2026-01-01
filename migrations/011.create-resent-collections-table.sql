CREATE TABLE recent_collections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    card_count INTEGER NOT NULL DEFAULT 0,

    last_opened TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_recent_collection_per_user
        UNIQUE (user_id, collection_id)
);

CREATE INDEX idx_recent_collections_home
ON recent_collections (user_id, last_opened DESC);