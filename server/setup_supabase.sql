CREATE TABLE IF NOT EXISTS video_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url_hash TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    platform TEXT,
    title TEXT,
    duration_seconds INTEGER,
    summary TEXT,
    transcript TEXT,
    claims JSONB DEFAULT '[]'::jsonb,
    perspectives JSONB DEFAULT '{}'::jsonb,
    bias_analysis JSONB DEFAULT '{}'::jsonb,
    points_awarded INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_analyses_url_hash ON video_analyses(url_hash);

CREATE TABLE IF NOT EXISTS user_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    analysis_id UUID REFERENCES video_analyses(id),
    points_earned INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_analyses_user_id ON user_analyses(user_id);

CREATE TABLE IF NOT EXISTS user_scores (
    user_id UUID PRIMARY KEY,
    current_score INTEGER DEFAULT 0,
    total_analyses INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    tree_state TEXT DEFAULT 'seedling',
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION get_tree_state(score INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF score < 100 THEN RETURN 'seedling';
    ELSIF score < 500 THEN RETURN 'sapling';
    ELSIF score < 1000 THEN RETURN 'healthy';
    ELSE RETURN 'blooming';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- SOCIAL TABLES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    display_name TEXT DEFAULT 'Anon',
    avatar_url TEXT,
    is_activity_public BOOLEAN DEFAULT true,
    age INTEGER,
    major TEXT,
    interests TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    friend_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    action_type TEXT,
    description TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- FRIEND CODES & CIRCLES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS friend_codes (
    user_id UUID PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '🌿',
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circle_members (
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circles_owner ON circles(owner_id);
CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code);
