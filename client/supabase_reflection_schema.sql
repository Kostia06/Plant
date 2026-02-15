-- Yggdrasil Daily Reflection System Schema
-- Run against Supabase SQL Editor

-- Reflections table
CREATE TABLE IF NOT EXISTS reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  mood_rating INT CHECK (mood_rating BETWEEN 1 AND 5),
  ai_feedback TEXT,
  points_earned INT DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reflections_user_date
  ON reflections(user_id, reflection_date);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

-- Daily teasers cache
CREATE TABLE IF NOT EXISTS daily_teasers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teaser_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  teasers JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teaser attempts
CREATE TABLE IF NOT EXISTS teaser_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  teaser_date DATE NOT NULL DEFAULT CURRENT_DATE,
  teaser_index INT NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teaser_attempts_unique
  ON teaser_attempts(user_id, teaser_date, teaser_index);

-- Points ledger
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  ledger_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  points INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user_date
  ON points_ledger(user_id, ledger_date);

-- Add new columns to user_scores
ALTER TABLE user_scores
  ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date DATE,
  ADD COLUMN IF NOT EXISTS total_reflections INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_goals_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_teasers_correct INT DEFAULT 0;

-- Recalculate user score from ledger
CREATE OR REPLACE FUNCTION recalc_user_score(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE user_scores
  SET current_score = COALESCE(
    (SELECT SUM(points) FROM points_ledger WHERE user_id = p_user_id), 0
  ),
  tree_state = CASE
    WHEN COALESCE((SELECT SUM(points) FROM points_ledger WHERE user_id = p_user_id), 0) >= 1000 THEN 'blooming'
    WHEN COALESCE((SELECT SUM(points) FROM points_ledger WHERE user_id = p_user_id), 0) >= 500 THEN 'healthy'
    WHEN COALESCE((SELECT SUM(points) FROM points_ledger WHERE user_id = p_user_id), 0) >= 100 THEN 'sapling'
    ELSE 'seedling'
  END
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_scores (user_id, current_score, tree_state)
    VALUES (
      p_user_id,
      COALESCE((SELECT SUM(points) FROM points_ledger WHERE user_id = p_user_id), 0),
      CASE
        WHEN COALESCE((SELECT SUM(points) FROM points_ledger WHERE user_id = p_user_id), 0) >= 1000 THEN 'blooming'
        WHEN COALESCE((SELECT SUM(points) FROM points_ledger WHERE user_id = p_user_id), 0) >= 500 THEN 'healthy'
        WHEN COALESCE((SELECT SUM(points) FROM points_ledger WHERE user_id = p_user_id), 0) >= 100 THEN 'sapling'
        ELSE 'seedling'
      END
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
