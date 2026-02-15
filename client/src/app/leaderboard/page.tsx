"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const TREE_EMOJI: Record<string, string> = {
    seedling: "🌱",
    sapling: "🌿",
    healthy: "🌳",
    blooming: "🌸",
    withered: "🥀",
};

interface LeaderboardEntry {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    current_score: number;
    tree_state: string;
    streak_days: number;
    is_you: boolean;
    rank: number;
}

export default function LeaderboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [friendId, setFriendId] = useState("");
    const [addMsg, setAddMsg] = useState("");
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingRequests, setPendingRequests] = useState<
        { id: string; profiles: { display_name: string } }[]
    >([]);
    const [showPending, setShowPending] = useState(false);

    const fetchLeaderboard = async () => {
        if (!user) return;
        try {
            // Fetch leaderboard — user + accepted friends
            // We query directly from Supabase client since the API needs auth headers
            const friendships = await supabase
                .from("friendships")
                .select("user_id, friend_id")
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
                .eq("status", "accepted");

            const friendIds = new Set<string>();
            friendIds.add(user.id);
            for (const f of friendships.data || []) {
                friendIds.add(f.user_id === user.id ? f.friend_id : f.user_id);
            }

            const ids = Array.from(friendIds);
            const scores = await supabase
                .from("user_scores")
                .select("*")
                .in("user_id", ids);
            const profiles = await supabase
                .from("profiles")
                .select("*")
                .in("id", ids);

            const scoreMap = new Map(
                (scores.data || []).map((s) => [s.user_id, s])
            );
            const profileMap = new Map(
                (profiles.data || []).map((p) => [p.id, p])
            );

            const board: LeaderboardEntry[] = ids.map((id) => {
                const s = scoreMap.get(id) || {
                    current_score: 0,
                    tree_state: "seedling",
                    streak_days: 0,
                };
                const p = profileMap.get(id) || {
                    display_name: "Anon",
                    avatar_url: null,
                };
                return {
                    user_id: id,
                    display_name: p.display_name,
                    avatar_url: p.avatar_url,
                    current_score: s.current_score,
                    tree_state: s.tree_state,
                    streak_days: s.streak_days,
                    is_you: id === user.id,
                    rank: 0,
                };
            });

            board.sort((a, b) => b.current_score - a.current_score);
            board.forEach((e, i) => (e.rank = i + 1));
            setEntries(board);
        } catch (err) {
            console.error("Failed to load leaderboard", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPending = async () => {
        if (!user) return;
        const { data } = await supabase
            .from("friendships")
            .select("id, user_id, profiles!friendships_user_id_fkey(display_name)")
            .eq("friend_id", user.id)
            .eq("status", "pending");

        const mapped = (data || []).map((d) => ({
            id: d.id,
            profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
        }));
        setPendingRequests(mapped);
        setPendingCount(mapped.length);
    };

    useEffect(() => {
        if (!authLoading && user) {
            fetchLeaderboard();
            fetchPending();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user]);

    const addFriend = async () => {
        if (!friendId.trim()) return;
        setAddMsg("");
        try {
            const { error } = await supabase
                .from("friendships")
                .insert({ user_id: user!.id, friend_id: friendId.trim(), status: "pending" });

            if (error) throw error;
            setAddMsg("Request sent!");
            setFriendId("");
        } catch (err: unknown) {
            setAddMsg(err instanceof Error ? err.message : "Failed");
        }
    };

    const respondToRequest = async (friendshipId: string, accept: boolean) => {
        await supabase
            .from("friendships")
            .update({ status: accept ? "accepted" : "declined" })
            .eq("id", friendshipId);

        fetchPending();
        if (accept) fetchLeaderboard();
    };

    if (authLoading) {
        return <div className="page-center"><p className="loading-text">Loading...</p></div>;
    }

    if (!user) {
        return (
            <div className="page-center">
                <div className="card">
                    <h2 className="card-title">🔒 Login Required</h2>
                    <p className="card-subtitle">You need to log in to view the leaderboard.</p>
                    <Link href="/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
                        Log In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 className="page-title">🏆 Leaderboard</h1>

            {/* Add Friend */}
            <div className="card card-add-friend">
                <h3>Add a Friend</h3>
                <div className="add-friend-row">
                    <input
                        type="text"
                        placeholder="Paste friend's user ID"
                        value={friendId}
                        onChange={(e) => setFriendId(e.target.value)}
                        className="input"
                    />
                    <button onClick={addFriend} className="btn btn-primary btn-sm">
                        Add
                    </button>
                </div>
                {addMsg && <p className="feed-points" style={{ marginTop: "0.5rem" }}>{addMsg}</p>}
            </div>

            {/* Pending Requests */}
            {pendingCount > 0 && (
                <div className="card">
                    <button
                        className="btn-link"
                        onClick={() => setShowPending(!showPending)}
                    >
                        📬 {pendingCount} pending request{pendingCount > 1 ? "s" : ""}
                        {showPending ? " ▲" : " ▼"}
                    </button>
                    {showPending &&
                        pendingRequests.map((req) => (
                            <div key={req.id} className="pending-row">
                                <span>{req.profiles?.display_name || "Unknown"}</span>
                                <div className="pending-actions">
                                    <button
                                        onClick={() => respondToRequest(req.id, true)}
                                        className="btn btn-accept btn-sm"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={() => respondToRequest(req.id, false)}
                                        className="btn btn-decline btn-sm"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Leaderboard Table */}
            {loading ? (
                <p className="loading-text">Loading scores...</p>
            ) : entries.length === 0 ? (
                <div className="card">
                    <p className="card-subtitle">No friends yet. Add some to compete!</p>
                </div>
            ) : (
                <div className="leaderboard-table">
                    {entries.map((entry) => (
                        <Link
                            key={entry.user_id}
                            href={`/profile/${entry.user_id}`}
                            className={`leaderboard-row ${entry.is_you ? "leaderboard-row--you" : ""}`}
                        >
                            <span className="lb-rank">
                                {entry.rank === 1
                                    ? "👑"
                                    : entry.rank === 2
                                        ? "🥈"
                                        : entry.rank === 3
                                            ? "🥉"
                                            : `#${entry.rank}`}
                            </span>
                            <span className="lb-tree">
                                {TREE_EMOJI[entry.tree_state] || "🌱"}
                            </span>
                            <span className="lb-name">
                                {entry.display_name}
                                {entry.is_you && <span className="lb-you-badge">YOU</span>}
                            </span>
                            <span className="lb-score">{entry.current_score} pts</span>
                            <span className="lb-streak">🔥 {entry.streak_days}d</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
