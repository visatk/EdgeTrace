DROP TABLE IF EXISTS scans;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    tg_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free', 
    credits INTEGER NOT NULL DEFAULT 5,
    last_reset_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id INTEGER NOT NULL,
    target TEXT NOT NULL,
    tool TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tg_id) REFERENCES users(tg_id) ON DELETE CASCADE
);

CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_scans_tg_id ON scans(tg_id);
