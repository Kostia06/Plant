"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface LeaderboardEntry {
    user_id: string;
    current_score: number;
    streak_days: number;
    tree_state: string;
    display_name: string;
    avatar_url: string | null;
}

interface CircleOption {
    id: string;
    name: string;
    emoji: string;
}

const TREE_EMOJIS: Record<string, string> = {
    seedling: "🌱",
    sapling: "🌿",
    healthy: "🌳",
    blooming: "🌸",
};

const RANK_BADGES = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [circles, setCircles] = useState<CircleOption[]>([]);
    const [selectedCircle, setSelectedCircle] = useState<string>("all");

    useEffect(() => {
        loadLeaderboard();
        if (user) loadCircles();
    }, [user]);

    useEffect(() => {
        loadLeaderboard();
    }, [selectedCircle]);

    async function loadCircles() {
        if (!user) return;

        const { data: memberships } = await supabase
            .from("circle_members")
            .select("circle_id")
            .eq("user_id", user.id);

        const circleIds = (memberships ?? []).map((m) => m.circle_id);

        if (circleIds.length > 0) {
            const { data } = await supabase
                .from("circles")
                .select("id, name, emoji")
                .in("id", circleIds);
            setCircles(data ?? []);
        }
    }

    async function loadLeaderboard() {
        setLoading(true);

        let userIds: string[] | null = null;

        if (selectedCircle !== "all" && selectedCircle !== "friends") {
            // Circle-specific leaderboard
            const { data: members } = await supabase
                .from("circle_members")
                .select("user_id")
                .eq("circle_id", selectedCircle);
            userIds = (members ?? []).map((m) => m.user_id);
        } else if (selectedCircle === "friends" && user) {
            // Friends-only leaderboard
            const { data: friendships } = await supabase
                .from("friendships")
                .select("user_id, friend_id")
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
                .eq("status", "accepted");

            userIds = [user.id];
            for (const f of friendships ?? []) {
                if (f.user_id === user.id) userIds.push(f.friend_id);
                else userIds.push(f.user_id);
            }
        }

        let query = supabase
            .from("user_scores")
            .select("user_id, current_score, streak_days, tree_state")
            .order("current_score", { ascending: false })
            .limit(50);

        if (userIds) {
            query = query.in("user_id", userIds);
        }

        const { data } = await query;

        if (!data) {
            setEntries([]);
            setLoading(false);
            return;
        }

        const ids = data.map((d) => d.user_id);
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", ids);

        const profileMap = new Map(
            (profiles ?? []).map((p) => [p.id, p])
        );

        const merged: LeaderboardEntry[] = data.map((d) => ({
            ...d,
            display_name: profileMap.get(d.user_id)?.display_name ?? "Anon",
            avatar_url: profileMap.get(d.user_id)?.avatar_url ?? null,
        }));

        setEntries(merged);
        setLoading(false);
    }

    return (
        <div className="page-container lb-page">
            <h1 className="page-title">🏆 LEADERBOARD</h1>

            {/* Circle Filter */}
            {user && (
                <div className="lb-filter">
                    <select
                        value={selectedCircle}
                        onChange={(e) => setSelectedCircle(e.target.value)}
                        className="input lb-filter-select"
                    >
                        <option value="all">🌍 Everyone</option>
                        <option value="friends">👥 Friends Only</option>
                        {circles.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.emoji} {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {loading ? (
                <p className="loading-text">Loading leaderboard...</p>
            ) : entries.length === 0 ? (
                <div className="lb-empty">
                    <p className="lb-empty-icon">🌱</p>
                    <p className="lb-empty-text">
                        {selectedCircle !== "all"
                            ? "No members in this group yet."
                            : "No growers yet. Be the first!"}
                    </p>
                </div>
            ) : (
                <div className="lb-list">
                    {entries.map((entry, i) => {
                        const isMe = entry.user_id === user?.id;
                        return (
                            <Link
                                key={entry.user_id}
                                href={`/profile/${entry.user_id}`}
                                className={`lb-row ${isMe ? "lb-row--me" : ""} ${i < 3 ? "lb-row--top" : ""
                                    }`}
                            >
                                <span className="lb-rank">
                                    {i < 3 ? RANK_BADGES[i] : `#${i + 1}`}
                                </span>

                                <div className="lb-avatar">
                                    {entry.avatar_url ? (
                                        <img
                                            src={entry.avatar_url}
                                            alt=""
                                            className="lb-avatar-img"
                                        />
                                    ) : (
                                        <span className="lb-avatar-fallback">
                                            {entry.display_name[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                <div className="lb-info">
                                    <span className="lb-name">
                                        {entry.display_name}
                                        {isMe && <span className="lb-you-badge">YOU</span>}
                                    </span>
                                    <span className="lb-meta">
                                        {TREE_EMOJIS[entry.tree_state] ?? "🌱"}{" "}
                                        {entry.tree_state} · 🔥 {entry.streak_days}d streak
                                    </span>
                                </div>

                                <span className="lb-score">{entry.current_score}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
