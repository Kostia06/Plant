"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface CircleData {
    id: string;
    name: string;
    emoji: string;
    owner_id: string;
}

interface MemberData {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    current_score: number;
    tree_state: string;
    streak_days: number;
}

interface FriendOption {
    id: string;
    display_name: string;
}

export default function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { user } = useAuth();
    const [circle, setCircle] = useState<CircleData | null>(null);
    const [members, setMembers] = useState<MemberData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddMember, setShowAddMember] = useState(false);
    const [friendOptions, setFriendOptions] = useState<FriendOption[]>([]);
    const [message, setMessage] = useState("");

    const isOwner = circle?.owner_id === user?.id;

    useEffect(() => {
        if (user) loadCircle();
        else setLoading(false);
    }, [user, resolvedParams.id]);

    async function loadCircle() {
        setLoading(true);

        const { data: circleData } = await supabase
            .from("circles")
            .select("*")
            .eq("id", resolvedParams.id)
            .single();

        if (!circleData) {
            setLoading(false);
            return;
        }
        setCircle(circleData);

        const { data: memberRows } = await supabase
            .from("circle_members")
            .select("user_id")
            .eq("circle_id", resolvedParams.id);

        const memberIds = (memberRows ?? []).map((m) => m.user_id);

        if (memberIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .in("id", memberIds);

            const { data: scores } = await supabase
                .from("user_scores")
                .select("user_id, current_score, tree_state, streak_days")
                .in("user_id", memberIds);

            const scoreMap = new Map((scores ?? []).map((s) => [s.user_id, s]));

            const merged: MemberData[] = (profiles ?? [])
                .map((p) => ({
                    user_id: p.id,
                    display_name: p.display_name,
                    avatar_url: p.avatar_url,
                    current_score: scoreMap.get(p.id)?.current_score ?? 0,
                    tree_state: scoreMap.get(p.id)?.tree_state ?? "seedling",
                    streak_days: scoreMap.get(p.id)?.streak_days ?? 0,
                }))
                .sort((a, b) => b.current_score - a.current_score);

            setMembers(merged);
        } else {
            setMembers([]);
        }

        setLoading(false);
    }

    async function loadFriendOptions() {
        if (!user) return;

        const { data: friendships } = await supabase
            .from("friendships")
            .select("user_id, friend_id")
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
            .eq("status", "accepted");

        const friendIds = (friendships ?? []).map((f) =>
            f.user_id === user.id ? f.friend_id : f.user_id
        );

        const existingIds = new Set(members.map((m) => m.user_id));
        const availableIds = friendIds.filter((id) => !existingIds.has(id));

        if (availableIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, display_name")
                .in("id", availableIds);

            setFriendOptions(profiles ?? []);
        } else {
            setFriendOptions([]);
        }
        setShowAddMember(true);
    }

    async function addMember(friendId: string) {
        await supabase.from("circle_members").insert({
            circle_id: resolvedParams.id,
            user_id: friendId,
        });
        setMessage("Member added!");
        setShowAddMember(false);
        loadCircle();
        setTimeout(() => setMessage(""), 2000);
    }

    async function leaveCircle() {
        if (!user) return;
        await supabase
            .from("circle_members")
            .delete()
            .eq("circle_id", resolvedParams.id)
            .eq("user_id", user.id);
        window.location.href = "/circles";
    }

    async function deleteCircle() {
        if (!user) return;
        await supabase.from("circles").delete().eq("id", resolvedParams.id);
        window.location.href = "/circles";
    }

    if (loading) return <p className="loading-text">Loading circle...</p>;

    if (!circle) {
        return (
            <div className="page-container ci-page">
                <p className="loading-text">Circle not found</p>
                <Link href="/circles" className="btn btn-primary">Back to Circles</Link>
            </div>
        );
    }

    return (
        <div className="page-container ci-page">
            {/* Circle Header */}
            <div className="ci-detail-header">
                <Link href="/circles" className="ci-back">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Circles
                </Link>
                <div className="ci-detail-title">
                    <span
                        className="ci-detail-dot"
                        style={{ backgroundColor: circle.emoji.startsWith('#') ? circle.emoji : '#4A7C59' }}
                    />
                    <h1 className="ci-detail-name">{circle.name}</h1>
                </div>
                <span className="ci-detail-count">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
            </div>

            {message && <p className="fr-message">{message}</p>}

            {/* Circle Leaderboard */}
            <div className="ci-section">
                <h2 className="fr-section-title">Circle Leaderboard</h2>
                {members.length === 0 ? (
                    <p className="pf-empty">No members yet. Add friends!</p>
                ) : (
                    <div className="lb-list">
                        {members.map((m, i) => {
                            const isMe = m.user_id === user?.id;
                            return (
                                <Link
                                    key={m.user_id}
                                    href={`/profile/${m.user_id}`}
                                    className={`lb-row ${isMe ? "lb-row--me" : ""} ${i < 3 ? "lb-row--top" : ""}`}
                                >
                                    <span className="lb-rank">
                                        {`#${i + 1}`}
                                    </span>
                                    <div className="lb-avatar">
                                        {m.avatar_url ? (
                                            <img src={m.avatar_url} alt="" className="lb-avatar-img" />
                                        ) : (
                                            <span className="lb-avatar-fallback">
                                                {m.display_name[0]?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="lb-info">
                                        <span className="lb-name">
                                            {m.display_name}
                                            {isMe && <span className="lb-you-badge">YOU</span>}
                                        </span>
                                        <span className="lb-meta">
                                            {m.tree_state} · {m.streak_days}d streak
                                        </span>
                                    </div>
                                    <span className="lb-score">{m.current_score}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Members (Owner only) */}
            {isOwner && (
                <div className="ci-section">
                    {!showAddMember ? (
                        <button
                            className="btn btn-primary ci-add-btn"
                            onClick={loadFriendOptions}
                        >
                            Add Members
                        </button>
                    ) : (
                        <div className="ci-add-members">
                            <h3 className="fr-section-title">Add a Friend</h3>
                            {friendOptions.length === 0 ? (
                                <p className="pf-empty">
                                    All your friends are already in this circle, or you have no
                                    friends yet.
                                </p>
                            ) : (
                                <div className="fr-list">
                                    {friendOptions.map((f) => (
                                        <div key={f.id} className="fr-row">
                                            <div className="fr-avatar">
                                                <span className="fr-avatar-fallback">
                                                    {f.display_name[0]?.toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="fr-name">{f.display_name}</span>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => addMember(f.id)}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                className="btn btn-sm btn-outline ci-cancel-btn"
                                onClick={() => setShowAddMember(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="ci-actions">
                {!isOwner && (
                    <button
                        className="btn btn-outline ci-leave-btn"
                        onClick={leaveCircle}
                    >
                        Leave Circle
                    </button>
                )}
                {isOwner && (
                    <button
                        className="btn btn-danger ci-delete-btn"
                        onClick={deleteCircle}
                    >
                        Delete Circle
                    </button>
                )}
            </div>
        </div>
    );
}
