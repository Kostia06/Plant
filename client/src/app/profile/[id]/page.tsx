"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import ActivityHeatmap from "../../components/ActivityHeatmap";
import FeedItem from "../../components/FeedItem";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const TREE_EMOJI: Record<string, string> = {
    seedling: "🌱",
    sapling: "🌿",
    healthy: "🌳",
    blooming: "🌸",
    withered: "🥀",
};

interface Profile {
    display_name: string;
    avatar_url: string | null;
    is_activity_public: boolean;
}

interface Score {
    current_score: number;
    tree_state: string;
    streak_days: number;
    total_analyses: number;
}

interface Activity {
    id: string;
    action_type: string;
    description: string;
    points: number;
    created_at: string;
}

export default function ProfilePage() {
    const params = useParams();
    const userId = params.id as string;
    const { user, loading: authLoading } = useAuth();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [score, setScore] = useState<Score | null>(null);
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const copyId = async () => {
        await navigator.clipboard.writeText(userId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        if (authLoading) return;

        const fetchAll = async () => {
            try {
                const [profileRes, scoreRes, activityRes] = await Promise.all([
                    supabase.from("profiles").select("*").eq("id", userId).single(),
                    supabase
                        .from("user_scores")
                        .select("*")
                        .eq("user_id", userId)
                        .single(),
                    supabase
                        .from("activity_log")
                        .select("*")
                        .eq("user_id", userId)
                        .order("created_at", { ascending: false })
                        .limit(50),
                ]);

                setProfile(profileRes.data);
                setScore(scoreRes.data);
                setActivities(activityRes.data || []);

                // Build heatmap from activity
                const daily: Record<string, number> = {};
                for (const a of activityRes.data || []) {
                    const day = a.created_at.slice(0, 10);
                    daily[day] = (daily[day] || 0) + a.points;
                }
                setHeatmapData(daily);
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [userId, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="page-center">
                <p className="loading-text">Loading profile...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="page-center">
                <div className="card">
                    <h2 className="card-title">🔒 Login Required</h2>
                    <Link href="/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
                        Log In
                    </Link>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="page-center">
                <div className="card">
                    <h2 className="card-title">Profile not found</h2>
                </div>
            </div>
        );
    }

    const isOwnProfile = user.id === userId;

    return (
        <div className="page-container">
            {/* Profile Header */}
            <div className="card profile-header">
                <div className="profile-avatar">
                    {TREE_EMOJI[score?.tree_state || "seedling"]}
                </div>
                <div className="profile-info">
                    <h1 className="profile-name">
                        {profile.display_name}
                        {isOwnProfile && <span className="lb-you-badge">YOU</span>}
                    </h1>
                    {/* User ID — share with friends to add you */}
                    <div className="user-id-row">
                        <span className="user-id-label">ID:</span>
                        <code className="user-id-value">{userId.slice(0, 8)}...{userId.slice(-4)}</code>
                        <button onClick={copyId} className="btn btn-sm btn-copy">
                            {copied ? "✓ Copied!" : "📋 Copy"}
                        </button>
                    </div>
                    <div className="profile-stats">
                        <div className="stat-block">
                            <span className="stat-value">{score?.current_score || 0}</span>
                            <span className="stat-label">Score</span>
                        </div>
                        <div className="stat-block">
                            <span className="stat-value">🔥 {score?.streak_days || 0}</span>
                            <span className="stat-label">Streak</span>
                        </div>
                        <div className="stat-block">
                            <span className="stat-value">{score?.total_analyses || 0}</span>
                            <span className="stat-label">Analyses</span>
                        </div>
                        <div className="stat-block">
                            <span className="stat-value">
                                {TREE_EMOJI[score?.tree_state || "seedling"]}{" "}
                                {score?.tree_state || "seedling"}
                            </span>
                            <span className="stat-label">Tree</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Heatmap */}
            <div className="card">
                <ActivityHeatmap data={heatmapData} />
            </div>

            {/* Activity Feed */}
            <div className="card">
                <h3 className="heatmap-title">Recent Activity</h3>
                {activities.length === 0 ? (
                    <p className="card-subtitle">No activity yet.</p>
                ) : (
                    <div className="feed-list">
                        {activities.map((a) => (
                            <FeedItem
                                key={a.id}
                                actionType={a.action_type}
                                description={a.description}
                                points={a.points}
                                createdAt={a.created_at}
                                displayName={profile.display_name}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
