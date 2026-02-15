"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface ProfileData {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_activity_public: boolean;
    age: number | null;
    major: string | null;
    interests: string[];
}

interface ScoreData {
    current_score: number;
    streak_days: number;
    tree_state: string;
    total_analyses: number;
    total_reflections: number;
    total_goals_completed: number;
    total_teasers_correct: number;
}

interface ActivityItem {
    id: string;
    action_type: string;
    description: string | null;
    points: number;
    created_at: string;
}

const TREE_EMOJIS: Record<string, string> = {
    seedling: "🌱",
    sapling: "🌿",
    healthy: "🌳",
    blooming: "🌸",
};

const ACTION_ICONS: Record<string, string> = {
    analysis: "🔍",
    reflection: "📝",
    goal: "🎯",
    brain_teaser: "🧠",
    focus_session: "⏱️",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getHeatmapColor(count: number): string {
    if (count === 0) return "var(--twig)";
    if (count <= 2) return "var(--spring-canopy)";
    return "var(--deep-forest)";
}

function generateHeatmapDays(): string[] {
    const days: string[] = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
    }
    return days;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function ProfileClient({ id }: { id: string }) {
    const { user } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [scores, setScores] = useState<ScoreData | null>(null);
    const [activityDays, setActivityDays] = useState<Map<string, number>>(new Map());
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [privacyToggle, setPrivacyToggle] = useState(true);

    const isOwnProfile = id === "me" || id === user?.id;
    const targetId = isOwnProfile ? user?.id : id;

    useEffect(() => {
        if (!targetId) {
            setLoading(false);
            return;
        }
        loadProfile(targetId);
    }, [targetId]);

    async function loadProfile(uid: string) {
        setLoading(true);

        const [profileRes, scoresRes, activityRes, recentRes] = await Promise.all([
            supabase.from("profiles").select("*").eq("id", uid).single(),
            supabase.from("user_scores").select("*").eq("user_id", uid).single(),
            supabase
                .from("activity_log")
                .select("created_at")
                .eq("user_id", uid)
                .gte("created_at", new Date(Date.now() - 365 * 86400000).toISOString()),
            supabase.from("activity_log").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
        ]);

        if (profileRes.data) {
            setProfile(profileRes.data as ProfileData);
            setPrivacyToggle(profileRes.data.is_activity_public ?? true);
        }

        if (scoresRes.data) {
            setScores(scoresRes.data as ScoreData);
        }

        const dayMap = new Map<string, number>();
        if (activityRes.data) {
            for (const row of activityRes.data) {
                const day = row.created_at.split("T")[0];
                dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
            }
        }
        setActivityDays(dayMap);

        if (recentRes.data) {
            setRecentActivity(recentRes.data as ActivityItem[]);
        }

        setLoading(false);
    }

    async function togglePrivacy() {
        if (!user) return;
        const newVal = !privacyToggle;
        setPrivacyToggle(newVal);
        await supabase.from("profiles").update({ is_activity_public: newVal }).eq("id", user.id);
    }

    if (loading) return <p className="loading-text">Loading profile...</p>;

    if (!targetId || (!isOwnProfile && !user)) {
        return (
            <div className="page-container pf-page">
                <div className="pf-login-prompt">
                    <p>🌱</p>
                    <p className="pf-login-text">Sign in to view profiles</p>
                    <Link href="/login" className="btn btn-primary">Sign In</Link>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="page-container pf-page">
                <p className="loading-text">Profile not found</p>
            </div>
        );
    }

    const heatmapDays = generateHeatmapDays();
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    heatmapDays.forEach((day, i) => {
        const month = new Date(day).getMonth();
        if (month !== lastMonth) {
            lastMonth = month;
            monthLabels.push({ label: MONTHS[month], col: Math.floor(i / 7) });
        }
    });

    return (
        <div className="page-container pf-page">
            <div className="pf-header">
                <div className="pf-avatar-lg">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="pf-avatar-img" />
                    ) : (
                        <span className="pf-avatar-fallback-lg">{profile.display_name[0]?.toUpperCase()}</span>
                    )}
                </div>
                <div className="pf-header-info">
                    <h1 className="pf-name">{profile.display_name}</h1>
                    <div className="pf-details">
                        {profile.age && <span>{profile.age}y</span>}
                        {profile.major && <span>📚 {profile.major}</span>}
                    </div>
                    {profile.interests && profile.interests.length > 0 && (
                        <div className="pf-tags">
                            {profile.interests.map((tag) => (
                                <span key={tag} className="pf-tag">{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {scores && (
                <div className="pf-stats">
                    <div className="pf-stat">
                        <span className="pf-stat-value">{scores.current_score}</span>
                        <span className="pf-stat-label">Score</span>
                    </div>
                    <div className="pf-stat">
                        <span className="pf-stat-value">{TREE_EMOJIS[scores.tree_state] ?? "🌱"}</span>
                        <span className="pf-stat-label">{scores.tree_state}</span>
                    </div>
                    <div className="pf-stat">
                        <span className="pf-stat-value">🔥 {scores.streak_days}</span>
                        <span className="pf-stat-label">Streak</span>
                    </div>
                    <div className="pf-stat">
                        <span className="pf-stat-value">{scores.total_analyses}</span>
                        <span className="pf-stat-label">Analyses</span>
                    </div>
                </div>
            )}

            <div className="pf-section">
                <h2 className="pf-section-title">📊 Activity</h2>
                <div className="hm-container">
                    <div className="hm-months">
                        {monthLabels.map((m) => (
                            <span key={m.label + m.col} className="hm-month-label" style={{ gridColumn: m.col + 1 }}>
                                {m.label}
                            </span>
                        ))}
                    </div>
                    <div className="hm-grid">
                        {heatmapDays.map((day) => {
                            const count = activityDays.get(day) ?? 0;
                            return <div key={day} className="hm-cell" style={{ background: getHeatmapColor(count) }} title={`${day}: ${count} actions`} />;
                        })}
                    </div>
                    <div className="hm-legend">
                        <span className="hm-legend-label">Less</span>
                        <div className="hm-cell" style={{ background: "var(--twig)" }} />
                        <div className="hm-cell" style={{ background: "var(--spring-canopy)" }} />
                        <div className="hm-cell" style={{ background: "var(--deep-forest)" }} />
                        <span className="hm-legend-label">More</span>
                    </div>
                </div>
            </div>

            {isOwnProfile && (
                <div className="pf-privacy">
                    <span className="pf-privacy-label">🔒 Activity visible to friends</span>
                    <button onClick={togglePrivacy} className="pf-privacy-toggle">
                        <div className={`pg-toggle ${privacyToggle ? "pg-toggle--on" : ""}`}>
                            <div className="pg-toggle-knob" />
                        </div>
                    </button>
                </div>
            )}

            <div className="pf-section">
                <h2 className="pf-section-title">📋 Recent Activity</h2>
                {recentActivity.length === 0 ? (
                    <p className="pf-empty">No activity yet</p>
                ) : (
                    <div className="pf-activity-list">
                        {recentActivity.map((a) => (
                            <div key={a.id} className="pf-activity-item">
                                <span className="pf-activity-icon">{ACTION_ICONS[a.action_type] ?? "📌"}</span>
                                <div className="pf-activity-info">
                                    <span className="pf-activity-desc">{a.description ?? a.action_type}</span>
                                    <span className="pf-activity-meta">+{a.points} pts · {timeAgo(a.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
