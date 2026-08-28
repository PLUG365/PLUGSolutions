CREATE TABLE IF NOT EXISTS solution_slugs (
  slug TEXT PRIMARY KEY NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS reaction_totals (
  slug TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('interested', 'tried', 'adopted')),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (slug, reaction_type)
);

CREATE TABLE IF NOT EXISTS reaction_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('interested', 'tried', 'adopted')),
  visitor_hash TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  UNIQUE (slug, reaction_type, visitor_hash)
);

CREATE TABLE IF NOT EXISTS daily_usage (
  usage_date TEXT PRIMARY KEY NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0)
);

CREATE INDEX IF NOT EXISTS reaction_events_usage_date_idx ON reaction_events (usage_date);
