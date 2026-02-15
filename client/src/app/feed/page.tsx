"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface FeedEntry {
    id: string;
    user_id: string;
    action_type: string;
    description: string | null;
    points: number;
    created_at: string;
    display_name: string;
    avatar_url: string | null;
}

const ACTION_MESSAGES: Record<string, (desc: string | null) => string> = {
    analysis: (desc) =>
        `just fact-checked a video${desc ? ` about ${desc}` : ""}!`,
    reflection: () => "wrote a thoughtful reflection 📝",
    goal: (desc) => `completed a goal${desc ? `: ${desc}` : ""}! 🎯`,
    brain_teaser: () => "solved a brain teaser! 🧠",
    focus_session: (desc) =>
        `completed a ${desc ?? ""} focus session ⏱️`,
};

const ACTION_ICONS: Record<string, string> = {
    analysis: "🔍",
    reflection: "📝",
    goal: "🎯",
    brain_teaser: "🧠",
    focus_session: "⏱️",
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
}

export default function FeedPage() {
    const { user } = useAuth();
    const [feed, setFeed] = useState<FeedEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        loadFeed();
    }, [user]);

    async function loadFeed() {
        if (!user) return;
        setLoading(true);

        // Get accepted friends
        const { data: friendships } = await supabase
            .from("friendships")
            .select("user_id, friend_id")
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
            .eq("status", "accepted");

        const friendIds = new Set<string>();
        friendIds.add(user.id); // Include own activity
        if (friendships) {
            for (const f of friendships) {
                if (f.user_id === user.id) friendIds.add(f.friend_id);
                else friendIds.add(f.user_id);
            }
        }

        const ids = Array.from(friendIds);

        // Get profiles that are public
        const { data: publicProfiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, is_activity_public")
            .in("id", ids);

        const visibleIds = (publicProfiles ?? [])
            .filter((p) => p.is_activity_public || p.id === user.id)
            .map((p) => p.id);

        const profileMap = new Map(
            (publicProfiles ?? []).map((p) => [p.id, p])
        );

        if (visibleIds.length === 0) {
            setFeed([]);
            setLoading(false);
            return;
        }

        // Get recent activity from visible friends
        const { data: activities } = await supabase
            .from("activity_log")
            .select("*")
            .in("user_id", visibleIds)
            .order("created_at", { ascending: false })
            .limit(30);

        const entries: FeedEntry[] = (activities ?? []).map((a) => ({
            ...a,
            display_name: profileMap.get(a.user_id)?.display_name ?? "Anon",
            avatar_url: profileMap.get(a.user_id)?.avatar_url ?? null,
        }));

        setFeed(entries);
        setLoading(false);
    }

    if (!user) {
        return (
            <div className="page-container fd-page">
                <h1 className="page-title">📰 FEED</h1>
                <div className="fd-login-prompt">
                    <p className="fd-login-icon">🌱</p>
                    <p className="fd-login-text">Sign in to see your friends' activity</p>
                    <Link href="/login" className="btn btn-primary">Sign In</Link>
                </div>
            </div>
        );
    }

    if (loading) return <p className="loading-text">Loading feed...</p>;

    return (
        <div className="page-container fd-page">
            <h1 className="page-title">📰 FEED</h1>

            {feed.length === 0 ? (
                <div className="fd-empty">
                    <p className="fd-empty-icon">🌿</p>
                    <p className="fd-empty-text">
                        No activity yet. Add friends and start growing together!
                    </p>
                </div>
            ) : (
                <div className="fd-list">
                    {feed.map((entry) => (
                        <div key={entry.id} className="fd-item">
                            <Link
                                href={`/profile/${entry.user_id}`}
                                className="fd-avatar"
                            >
                                {entry.avatar_url ? (
                                    <img src={entry.avatar_url} alt="" className="fd-avatar-img" />
                                ) : (
                                    <span className="fd-avatar-fallback">
                                        {entry.display_name[0]?.toUpperCase()}
                                    </span>
                                )}
                            </Link>
                            <div className="fd-content">
                                <p className="fd-text">
                                    <Link
                                        href={`/profile/${entry.user_id}`}
                                        className="fd-username"
                                    >
                                        {entry.display_name}
                                    </Link>{" "}
                                    {ACTION_MESSAGES[entry.action_type]?.(entry.description) ??
                                        entry.description ??
                                        entry.action_type}
                                </p>
                                <div className="fd-meta">
                                    <span>{ACTION_ICONS[entry.action_type] ?? "📌"}</span>
                                    <span>+{entry.points} pts</span>
                                    <span>{timeAgo(entry.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
