"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface Circle {
    id: string;
    name: string;
    emoji: string;
    owner_id: string;
    member_count: number;
}

const CIRCLE_EMOJIS = ["🔥", "🌿", "⚡", "🎯", "🧠", "💪", "🌸", "🏔️", "🎮", "📚", "🌙", "☀️"];

export default function CirclesPage() {
    const { user } = useAuth();
    const [circles, setCircles] = useState<Circle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmoji, setNewEmoji] = useState("🔥");

    useEffect(() => {
        if (user) loadCircles();
        else setLoading(false);
    }, [user]);

    async function loadCircles() {
        setLoading(true);

        // Get circles the user is a member of
        const { data: memberships } = await supabase
            .from("circle_members")
            .select("circle_id")
            .eq("user_id", user!.id);

        const circleIds = (memberships ?? []).map((m) => m.circle_id);

        // Also get circles the user owns
        const { data: ownedCircles } = await supabase
            .from("circles")
            .select("*")
            .eq("owner_id", user!.id);

        const ownedIds = (ownedCircles ?? []).map((c) => c.id);
        const allIds = [...new Set([...circleIds, ...ownedIds])];

        if (allIds.length === 0) {
            setCircles([]);
            setLoading(false);
            return;
        }

        const { data: circlesData } = await supabase
            .from("circles")
            .select("*")
            .in("id", allIds);

        // Get member counts
        const circlesWithCounts: Circle[] = [];
        for (const c of circlesData ?? []) {
            const { count } = await supabase
                .from("circle_members")
                .select("*", { count: "exact", head: true })
                .eq("circle_id", c.id);

            circlesWithCounts.push({
                ...c,
                member_count: (count ?? 0) + 1, // +1 for owner
            });
        }

        setCircles(circlesWithCounts);
        setLoading(false);
    }

    async function createCircle() {
        if (!user || !newName.trim()) return;

        const { data } = await supabase
            .from("circles")
            .insert({
                name: newName.trim(),
                emoji: newEmoji,
                owner_id: user.id,
            })
            .select()
            .single();

        if (data) {
            // Auto-add owner as member
            await supabase.from("circle_members").insert({
                circle_id: data.id,
                user_id: user.id,
            });
        }

        setNewName("");
        setShowCreate(false);
        loadCircles();
    }

    if (!user) {
        return (
            <div className="page-container ci-page">
                <h1 className="page-title">🔵 CIRCLES</h1>
                <div className="fr-login-prompt">
                    <p className="fd-login-icon">🌱</p>
                    <p className="fd-login-text">Sign in to create circles</p>
                    <Link href="/login" className="btn btn-primary">Sign In</Link>
                </div>
            </div>
        );
    }

    if (loading) return <p className="loading-text">Loading circles...</p>;

    return (
        <div className="page-container ci-page">
            <div className="ci-header">
                <h1 className="page-title">🔵 CIRCLES</h1>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCreate(!showCreate)}
                >
                    {showCreate ? "Cancel" : "+ New Circle"}
                </button>
            </div>

            {/* Create Circle Form */}
            {showCreate && (
                <div className="ci-create-card">
                    <h3 className="ci-create-title">Create a Circle</h3>
                    <div className="ci-emoji-picker">
                        {CIRCLE_EMOJIS.map((e) => (
                            <button
                                key={e}
                                className={`ci-emoji-btn ${newEmoji === e ? "ci-emoji-btn--active" : ""}`}
                                onClick={() => setNewEmoji(e)}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Circle name (e.g., Study Buddies)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="input ci-name-input"
                        maxLength={30}
                    />
                    <button
                        className="btn btn-primary ci-create-btn"
                        onClick={createCircle}
                        disabled={!newName.trim()}
                    >
                        🌿 Create Circle
                    </button>
                </div>
            )}

            {/* Circles Grid */}
            {circles.length === 0 ? (
                <div className="ci-empty">
                    <p className="ci-empty-icon">🔵</p>
                    <p className="ci-empty-text">
                        No circles yet. Create one and invite your friends!
                    </p>
                </div>
            ) : (
                <div className="ci-grid">
                    {circles.map((c) => (
                        <Link
                            key={c.id}
                            href={`/circles/${c.id}`}
                            className="ci-card"
                        >
                            <span className="ci-card-emoji">{c.emoji}</span>
                            <span className="ci-card-name">{c.name}</span>
                            <span className="ci-card-members">
                                👥 {c.member_count} member{c.member_count !== 1 ? "s" : ""}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            <Link href="/friends" className="fr-circles-link">
                <span>👥</span>
                <span>Manage Friends</span>
                <span>→</span>
            </Link>
        </div>
    );
}
