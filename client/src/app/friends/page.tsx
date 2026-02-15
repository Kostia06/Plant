"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface FriendData {
    id: string;
    display_name: string;
    avatar_url: string | null;
    current_score: number;
    tree_state: string;
}

interface PendingRequest {
    id: string;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
}

function generateFriendCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BLOOM-";
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export default function FriendsPage() {
    const { user } = useAuth();
    const [myCode, setMyCode] = useState<string | null>(null);
    const [codeInput, setCodeInput] = useState("");
    const [friends, setFriends] = useState<FriendData[]>([]);
    const [pending, setPending] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [copied, setCopied] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        await ensureTables();

        const { data: codeData } = await supabase
            .from("friend_codes")
            .select("code")
            .eq("user_id", user.id)
            .single();

        if (codeData) {
            setMyCode(codeData.code);
        } else {
            const newCode = generateFriendCode();
            await supabase.from("friend_codes").insert({ user_id: user.id, code: newCode });
            setMyCode(newCode);
        }

        const { data: friendships } = await supabase
            .from("friendships")
            .select("user_id, friend_id")
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
            .eq("status", "accepted");

        const friendIds = (friendships ?? []).map((f) =>
            f.user_id === user.id ? f.friend_id : f.user_id
        );

        if (friendIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .in("id", friendIds);

            const { data: scores } = await supabase
                .from("user_scores")
                .select("user_id, current_score, tree_state")
                .in("user_id", friendIds);

            const scoreMap = new Map((scores ?? []).map((s) => [s.user_id, s]));

            setFriends(
                (profiles ?? []).map((p) => ({
                    id: p.id,
                    display_name: p.display_name,
                    avatar_url: p.avatar_url,
                    current_score: scoreMap.get(p.id)?.current_score ?? 0,
                    tree_state: scoreMap.get(p.id)?.tree_state ?? "seedling",
                }))
            );
        } else {
            setFriends([]);
        }

        const { data: pendingData } = await supabase
            .from("friendships")
            .select("id, user_id")
            .eq("friend_id", user.id)
            .eq("status", "pending");

        if (pendingData && pendingData.length > 0) {
            const senderIds = pendingData.map((p) => p.user_id);
            const { data: senderProfiles } = await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .in("id", senderIds);

            const profileMap = new Map(
                (senderProfiles ?? []).map((p) => [p.id, p])
            );

            setPending(
                pendingData.map((p) => ({
                    id: p.id,
                    user_id: p.user_id,
                    display_name: profileMap.get(p.user_id)?.display_name ?? "Anon",
                    avatar_url: profileMap.get(p.user_id)?.avatar_url ?? null,
                }))
            );
        } else {
            setPending([]);
        }

        setLoading(false);
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function ensureTables() { }

    async function addFriend() {
        if (!user || !codeInput.trim()) return;
        setMessage("");

        const code = codeInput.trim().toUpperCase();

        if (code === myCode) {
            setMessage("That's your own code!");
            return;
        }

        const { data: target } = await supabase
            .from("friend_codes")
            .select("user_id")
            .eq("code", code)
            .single();

        if (!target) {
            setMessage("Friend code not found. Check the code and try again.");
            return;
        }

        const { data: existing } = await supabase
            .from("friendships")
            .select("id, status")
            .or(
                `and(user_id.eq.${user.id},friend_id.eq.${target.user_id}),and(user_id.eq.${target.user_id},friend_id.eq.${user.id})`
            );

        if (existing && existing.length > 0) {
            const status = existing[0].status;
            if (status === "accepted") {
                setMessage("You're already friends!");
            } else if (status === "pending") {
                setMessage("Friend request already pending.");
            } else {
                setMessage("Request already sent.");
            }
            return;
        }

        await supabase.from("friendships").insert({
            user_id: user.id,
            friend_id: target.user_id,
            status: "pending",
        });

        setMessage("Friend request sent!");
        setCodeInput("");
    }

    async function acceptRequest(friendshipId: string) {
        await supabase
            .from("friendships")
            .update({ status: "accepted" })
            .eq("id", friendshipId);
        loadData();
    }

    async function declineRequest(friendshipId: string) {
        await supabase
            .from("friendships")
            .update({ status: "declined" })
            .eq("id", friendshipId);
        loadData();
    }

    async function copyCode() {
        if (myCode) {
            await navigator.clipboard.writeText(myCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    if (!user) {
        return (
            <div className="page-container fr-page">
                <h1 className="page-title">Friends</h1>
                <div className="fr-login-prompt">
                    <p className="fd-login-text">Sign in to add friends</p>
                    <Link href="/login" className="btn btn-primary">Sign In</Link>
                </div>
            </div>
        );
    }

    if (loading) return <p className="loading-text">Loading friends...</p>;

    return (
        <div className="page-container fr-page">
            <h1 className="page-title">Friends</h1>

            {/* Your Friend Code */}
            <div className="fc-card">
                <span className="fc-label">Your Friend Code</span>
                <div className="fc-code-row">
                    <span className="fc-code">{myCode}</span>
                    <button className="btn btn-sm" onClick={copyCode}>
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
                <span className="fc-hint">Share this code so friends can add you</span>
            </div>

            {/* Add Friend */}
            <div className="fr-add-section">
                <h2 className="fr-section-title">Add Friend</h2>
                <div className="fr-add-row">
                    <input
                        type="text"
                        placeholder="Enter friend code (e.g. BLOOM-A3X7)"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        className="input fr-code-input"
                        maxLength={10}
                    />
                    <button className="btn btn-primary fr-add-btn" onClick={addFriend}>
                        Add
                    </button>
                </div>
                {message && (
                    <p className="fr-message">{message}</p>
                )}
            </div>

            {/* Pending Requests */}
            {pending.length > 0 && (
                <div className="fr-section">
                    <h2 className="fr-section-title">
                        Pending Requests
                        <span className="fr-badge">{pending.length}</span>
                    </h2>
                    <div className="fr-list">
                        {pending.map((req) => (
                            <div key={req.id} className="fr-row fr-row--pending">
                                <div className="fr-avatar">
                                    {req.avatar_url ? (
                                        <img src={req.avatar_url} alt="" className="fr-avatar-img" />
                                    ) : (
                                        <span className="fr-avatar-fallback">
                                            {req.display_name[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <span className="fr-name">{req.display_name}</span>
                                <div className="fr-actions">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => acceptRequest(req.id)}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline"
                                        onClick={() => declineRequest(req.id)}
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div className="fr-section">
                <h2 className="fr-section-title">
                    Friends
                    <span className="fr-count">{friends.length}</span>
                </h2>
                {friends.length === 0 ? (
                    <div className="fr-empty">
                        <p className="fr-empty-text">
                            No friends yet. Share your code to get started!
                        </p>
                    </div>
                ) : (
                    <div className="fr-list">
                        {friends.map((f) => (
                            <Link
                                key={f.id}
                                href={`/profile/${f.id}`}
                                className="fr-row"
                            >
                                <div className="fr-avatar">
                                    {f.avatar_url ? (
                                        <img src={f.avatar_url} alt="" className="fr-avatar-img" />
                                    ) : (
                                        <span className="fr-avatar-fallback">
                                            {f.display_name[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="fr-info">
                                    <span className="fr-name">{f.display_name}</span>
                                    <span className="fr-meta">
                                        {f.tree_state} · {f.current_score} pts
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Circles Link */}
            <Link href="/circles" className="fr-circles-link">
                <span>Manage Circles</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </Link>
        </div>
    );
}
