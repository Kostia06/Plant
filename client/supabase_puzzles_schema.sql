-- ============================================
-- PUZZLE LIBRARY (cached generated puzzles)
-- ============================================
CREATE TABLE IF NOT EXISTS puzzles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'logic', 'math', 'critical_thinking', 'media_literacy',
        'statistics', 'cognitive_bias', 'scientific_reasoning',
        'ethical_dilemma', 'pattern_recognition', 'wordplay'
    )),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question TEXT NOT NULL,
    question_hash TEXT NOT NULL UNIQUE,
    options JSONB NOT NULL,
    correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
    explanation TEXT NOT NULL,
    hint TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    times_served INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_puzzles_topic ON puzzles(topic, difficulty);
CREATE INDEX IF NOT EXISTS idx_puzzles_category ON puzzles(category);
CREATE INDEX IF NOT EXISTS idx_puzzles_hash ON puzzles(question_hash);

-- ============================================
-- DAILY PUZZLE SETS (3 puzzles per day, per difficulty)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_puzzle_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    puzzle_date DATE NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
    topic TEXT NOT NULL DEFAULT 'general',
    puzzle_ids JSONB NOT NULL,
    UNIQUE(puzzle_date, difficulty, topic)
);

CREATE INDEX IF NOT EXISTS idx_daily_sets_date ON daily_puzzle_sets(puzzle_date);

-- ============================================
-- USER PUZZLE ATTEMPTS
-- ============================================
CREATE TABLE IF NOT EXISTS puzzle_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    puzzle_id UUID REFERENCES puzzles(id),
    user_answer INTEGER NOT NULL CHECK (user_answer >= 0 AND user_answer <= 3),
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    hint_used BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_puzzle_attempt_unique ON puzzle_attempts(user_id, puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_user ON puzzle_attempts(user_id, answered_at DESC);

-- ============================================
-- USER PUZZLE STATS
-- ============================================
CREATE TABLE IF NOT EXISTS puzzle_stats (
    user_id UUID PRIMARY KEY,
    total_attempted INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    best_category TEXT,
    worst_category TEXT,
    avg_time_seconds FLOAT DEFAULT 0,
    current_daily_streak INTEGER DEFAULT 0,
    longest_daily_streak INTEGER DEFAULT 0,
    logic_attempted INTEGER DEFAULT 0,
    logic_correct INTEGER DEFAULT 0,
    math_attempted INTEGER DEFAULT 0,
    math_correct INTEGER DEFAULT 0,
    critical_thinking_attempted INTEGER DEFAULT 0,
    critical_thinking_correct INTEGER DEFAULT 0,
    media_literacy_attempted INTEGER DEFAULT 0,
    media_literacy_correct INTEGER DEFAULT 0,
    statistics_attempted INTEGER DEFAULT 0,
    statistics_correct INTEGER DEFAULT 0,
    cognitive_bias_attempted INTEGER DEFAULT 0,
    cognitive_bias_correct INTEGER DEFAULT 0,
    scientific_reasoning_attempted INTEGER DEFAULT 0,
    scientific_reasoning_correct INTEGER DEFAULT 0,
    ethical_dilemma_attempted INTEGER DEFAULT 0,
    ethical_dilemma_correct INTEGER DEFAULT 0,
    pattern_recognition_attempted INTEGER DEFAULT 0,
    pattern_recognition_correct INTEGER DEFAULT 0,
    wordplay_attempted INTEGER DEFAULT 0,
    wordplay_correct INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DAILY PUZZLE LIMITS
-- ============================================
CREATE TABLE IF NOT EXISTS puzzle_daily_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    limit_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
    daily_puzzles_attempted INTEGER DEFAULT 0,
    custom_puzzles_generated INTEGER DEFAULT 0,
    custom_puzzles_attempted INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    UNIQUE(user_id, limit_date)
);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_puzzle_stats_on_attempt()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE puzzles SET
        times_served = times_served + 1,
        times_correct = times_correct + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        success_rate = (times_correct + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END)::float
                       / (times_served + 1)::float
    WHERE id = NEW.puzzle_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_puzzle_attempt ON puzzle_attempts;
CREATE TRIGGER trigger_puzzle_attempt
AFTER INSERT ON puzzle_attempts
FOR EACH ROW EXECUTE FUNCTION update_puzzle_stats_on_attempt();

CREATE OR REPLACE FUNCTION update_user_puzzle_stats(uid UUID)
RETURNS void AS $$
DECLARE
    stats RECORD;
    best TEXT;
    worst TEXT;
    best_rate FLOAT := -1;
    worst_rate FLOAT := 2;
    cat TEXT;
    att INTEGER;
    cor INTEGER;
    rate FLOAT;
BEGIN
    SELECT
        COUNT(*) as total_att,
        COUNT(*) FILTER (WHERE is_correct) as total_cor,
        COALESCE(SUM(points_earned), 0) as total_pts,
        COALESCE(AVG(time_taken_seconds), 0) as avg_time
    INTO stats
    FROM puzzle_attempts WHERE user_id = uid;

    INSERT INTO puzzle_stats (user_id, total_attempted, total_correct, total_points, avg_time_seconds, updated_at)
    VALUES (uid, stats.total_att, stats.total_cor, stats.total_pts, stats.avg_time, now())
    ON CONFLICT (user_id) DO UPDATE SET
        total_attempted = stats.total_att,
        total_correct = stats.total_cor,
        total_points = stats.total_pts,
        avg_time_seconds = stats.avg_time,
        updated_at = now();

    FOR cat IN SELECT unnest(ARRAY[
        'logic', 'math', 'critical_thinking', 'media_literacy',
        'statistics', 'cognitive_bias', 'scientific_reasoning',
        'ethical_dilemma', 'pattern_recognition', 'wordplay'
    ]) LOOP
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE pa.is_correct)
        INTO att, cor
        FROM puzzle_attempts pa
        JOIN puzzles p ON p.id = pa.puzzle_id
        WHERE pa.user_id = uid AND p.category = cat;

        EXECUTE format(
            'UPDATE puzzle_stats SET %I = $1, %I = $2 WHERE user_id = $3',
            cat || '_attempted',
            cat || '_correct'
        ) USING att, cor, uid;

        IF att >= 3 THEN
            rate := cor::float / att::float;
            IF rate > best_rate THEN best_rate := rate; best := cat; END IF;
            IF rate < worst_rate THEN worst_rate := rate; worst := cat; END IF;
        END IF;
    END LOOP;

    UPDATE puzzle_stats SET best_category = best, worst_category = worst WHERE user_id = uid;
END;
$$ LANGUAGE plpgsql;
