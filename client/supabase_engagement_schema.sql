-- ============================================
-- YGGDRASIL HARDENED ENGAGEMENT SCHEMA
-- ============================================

-- DAILY REFLECTIONS
CREATE TABLE reflections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    response_hash TEXT NOT NULL,
    ai_feedback TEXT,
    is_low_effort BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reflections_user_date ON reflections(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_reflections_one_per_day ON reflections(user_id, reflection_date);
CREATE UNIQUE INDEX idx_reflections_no_duplicates ON reflections(user_id, response_hash);

-- GOALS
-- (existing table, add constraint)
ALTER TABLE goals ADD CONSTRAINT goals_title_min_length CHECK (char_length(title) >= 10);

-- DAILY TEASERS (unchanged)
-- daily_teasers table already exists

-- TEASER ATTEMPTS (hardened)
CREATE TABLE teaser_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    teaser_date DATE NOT NULL,
    teaser_index INTEGER NOT NULL CHECK (teaser_index >= 0 AND teaser_index <= 2),
    user_answer INTEGER NOT NULL CHECK (user_answer >= 0 AND user_answer <= 3),
    is_correct BOOLEAN NOT NULL,
    points_earned INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_teaser_one_attempt ON teaser_attempts(user_id, teaser_date, teaser_index);

-- POINTS LEDGER (append-only, source of truth)
CREATE TABLE points_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN (
        'reflection', 'goal', 'teaser', 'analysis',
        'misinformation_bonus', 'first_action', 'streak_bonus',
        'weekly_milestone', 'decay'
    )),
    points INTEGER NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_points_user_date ON points_ledger(user_id, created_at DESC);
CREATE INDEX idx_points_action_date ON points_ledger(user_id, action);

-- USER SCORES (materialized from points_ledger)
-- Already exists, columns: user_id, current_score, total_analyses,
-- streak_days, tree_state, updated_at, total_reflections,
-- total_goals_completed, total_teasers_correct, last_active_date

-- DAILY LIMITS TRACKER
CREATE TABLE daily_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    limit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reflections_count INTEGER DEFAULT 0,
    goals_completed_count INTEGER DEFAULT 0,
    analyses_count INTEGER DEFAULT 0,
    misinformation_bonuses_count INTEGER DEFAULT 0,
    first_action_awarded BOOLEAN DEFAULT false,
    UNIQUE(user_id, limit_date)
);

CREATE INDEX idx_daily_limits_lookup ON daily_limits(user_id, limit_date);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Recalculate user score from ledger
CREATE OR REPLACE FUNCTION recalc_user_score(uid UUID)
RETURNS INTEGER AS $$
DECLARE
    total INTEGER;
    state TEXT;
BEGIN
    SELECT COALESCE(SUM(points), 0) INTO total
    FROM points_ledger WHERE user_id = uid;
    IF total < 0 THEN total := 0; END IF;
    IF total < 150 THEN state := 'seedling';
    ELSIF total < 500 THEN state := 'sapling';
    ELSIF total < 1000 THEN state := 'healthy';
    ELSE state := 'blooming';
    END IF;
    INSERT INTO user_scores (user_id, current_score, tree_state, last_active_date, updated_at)
    VALUES (uid, total, state, CURRENT_DATE, now())
    ON CONFLICT (user_id) DO UPDATE SET
        current_score = total, tree_state = state,
        last_active_date = CURRENT_DATE, updated_at = now();
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Get or create daily limits
CREATE OR REPLACE FUNCTION get_daily_limits(uid UUID)
RETURNS daily_limits AS $$
DECLARE
    result daily_limits;
BEGIN
    INSERT INTO daily_limits (user_id, limit_date)
    VALUES (uid, CURRENT_DATE)
    ON CONFLICT (user_id, limit_date) DO NOTHING;
    SELECT * INTO result FROM daily_limits
    WHERE user_id = uid AND limit_date = CURRENT_DATE;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Calculate streak from points_ledger
CREATE OR REPLACE FUNCTION calc_streak(uid UUID)
RETURNS INTEGER AS $$
DECLARE
    streak INTEGER := 0;
    check_date DATE := CURRENT_DATE - 1;
    day_points INTEGER;
BEGIN
    LOOP
        SELECT COALESCE(SUM(points), 0) INTO day_points
        FROM points_ledger
        WHERE user_id = uid
        AND (created_at AT TIME ZONE 'UTC')::date = check_date
        AND action != 'decay';
        IF day_points >= 15 THEN
            streak := streak + 1;
            check_date := check_date - 1;
        ELSE
            EXIT;
        END IF;
        IF streak >= 365 THEN EXIT; END IF;
    END LOOP;
    SELECT COALESCE(SUM(points), 0) INTO day_points
    FROM points_ledger
    WHERE user_id = uid
    AND (created_at AT TIME ZONE 'UTC')::date = CURRENT_DATE
    AND action != 'decay';
    IF day_points >= 15 THEN
        streak := streak + 1;
    END IF;
    UPDATE user_scores SET streak_days = streak WHERE user_id = uid;
    RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- Apply decay on login
CREATE OR REPLACE FUNCTION apply_decay(uid UUID)
RETURNS INTEGER AS $$
DECLARE
    last_date DATE;
    days_inactive INTEGER;
    decay_points INTEGER := 0;
BEGIN
    SELECT last_active_date INTO last_date FROM user_scores WHERE user_id = uid;
    IF last_date IS NULL THEN RETURN 0; END IF;
    days_inactive := CURRENT_DATE - last_date;
    IF days_inactive <= 1 THEN RETURN 0; END IF;
    IF days_inactive <= 6 THEN
        decay_points := (days_inactive - 1) * 10;
    ELSE
        decay_points := (5 * 10) + ((days_inactive - 6) * 20);
    END IF;
    IF decay_points > 0 THEN
        INSERT INTO points_ledger (user_id, action, points, description)
        VALUES (uid, 'decay', -decay_points,
            'Inactivity decay: ' || days_inactive || ' days inactive');
    END IF;
    RETURN decay_points;
END;
$$ LANGUAGE plpgsql;
