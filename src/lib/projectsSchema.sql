-- =============================================================================
-- Life OS — Projects Schema
-- Run this in the Supabase SQL editor to create all project-related tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  icon         TEXT,
  cover_color  TEXT,
  status       TEXT        NOT NULL DEFAULT 'Idea',
  repo_url     TEXT,
  demo_url     TEXT,
  doc_url      TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_updated
  ON projects (user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- 2. project_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL DEFAULT '',
  category    TEXT        NOT NULL DEFAULT 'General',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project_id
  ON project_notes (project_id);

-- ---------------------------------------------------------------------------
-- 3. project_experiments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_experiments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  objective   TEXT,
  hypothesis  TEXT,
  steps       TEXT,
  result      TEXT,
  status      TEXT        NOT NULL DEFAULT 'Pending',
  errors      TEXT,
  conclusion  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_experiments_project_id
  ON project_experiments (project_id);

-- ---------------------------------------------------------------------------
-- 4. project_built_features
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_built_features (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  description          TEXT,
  completion_date      DATE,
  implementation_notes TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_built_features_project_id
  ON project_built_features (project_id);

-- ---------------------------------------------------------------------------
-- 5. project_ideas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_ideas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  why_useful   TEXT,
  priority     TEXT        NOT NULL DEFAULT 'Medium',
  dependencies TEXT,
  status       TEXT        NOT NULL DEFAULT 'Idea',
  order_index  INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_ideas_project_id
  ON project_ideas (project_id);

-- ---------------------------------------------------------------------------
-- 6. project_learning
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_learning (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  notes       TEXT,
  resources   TEXT,
  status      TEXT        NOT NULL DEFAULT 'Not Started',
  next_task   TEXT,
  list_type   TEXT        NOT NULL DEFAULT 'to_learn',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_learning_project_id
  ON project_learning (project_id);

-- ---------------------------------------------------------------------------
-- 7. project_reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_reminders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  date        DATE        NOT NULL,
  time        TIME,
  recurring   TEXT,
  completed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_reminders_project_id
  ON project_reminders (project_id);

-- ---------------------------------------------------------------------------
-- 8. project_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  url         TEXT        NOT NULL,
  link_type   TEXT        NOT NULL DEFAULT 'other',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_links_project_id
  ON project_links (project_id);

-- ---------------------------------------------------------------------------
-- 9. project_pros_cons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_pros_cons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type  TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  explanation TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_pros_cons_project_id
  ON project_pros_cons (project_id);
