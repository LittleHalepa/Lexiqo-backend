
CREATE TABLE collections (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     description TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cards (
     id SERIAL PRIMARY KEY,
     collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
     term TEXT NOT NULL,
     definition TEXT NOT NULL,
     image TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
);
