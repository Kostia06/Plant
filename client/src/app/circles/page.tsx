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

const CIRCLE_COLORS = [
    "#4A7C59", "#5B8A72", "#6B9F8B",
    "#7EA88B", "#3D6B4F", "#2D5A3F",
    "#558B6E", "#6FA287", "#4E8565",
    "#3B7A52", "#477D5E", "#5A9474",
];

export default function CirclesPage() {
    const { user } = useAuth();
    const [circles, setCircles] = useState<Circle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [selectedColor, setSelectedColor] = useState(CIRCLE_COLORS[0]);

    useEffect(() => {
        if (user) loadCircles();
        else setLoading(false);
    }, [user]);

    async function loadCircles() {
        setLoading(true);

        const { data: memberships } = await supabase
            .from("circle_members")
            .select("circle_id")
            .eq("user_id", user!.id);

        const circleIds = (memberships ?? []).map((m) => m.circle_id);

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

        const circlesWithCounts: Circle[] = [];
        for (const c of circlesData ?? []) {
            const { count } = await supabase
                .from("circle_members")
                .select("*", { count: "exact", head: true })
                .eq("circle_id", c.id);

            circlesWithCounts.push({
                ...c,
                member_count: (count ?? 0) + 1,
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
                emoji: selectedColor,
                owner_id: user.id,
            })
            .select()
            .single();

        if (data) {
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
                <h1 className="page-title">Circles</h1>
                <div className="fr-login-prompt">
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
                <h1 className="page-title">Circles</h1>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCreate(!showCreate)}
                >
                    {showCreate ? "Cancel" : "New Circle"}
                </button>
            </div>

            {/* Create Circle Form */}
            {showCreate && (
                <div className="ci-create-card">
                    <h3 className="ci-create-title">Create a Circle</h3>
                    <div className="ci-color-picker">
                        {CIRCLE_COLORS.map((color) => (
                            <button
                                key={color}
                                className={`ci-color-btn ${selectedColor === color ? "ci-color-btn--active" : ""}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setSelectedColor(color)}
                            />
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
                        Create Circle
                    </button>
                </div>
            )}

            {/* Circles Grid */}
            {circles.length === 0 ? (
                <div className="ci-empty">
                    <p className="ci-empty-text">
                        No circles yet. Create one and invite your friends!
                    </p>
                </div>
            ) : (
                <div className="ci-grid">
                    {circles.map((c, i) => (
                        <Link
                            key={c.id}
                            href={`/circles/${c.id}`}
                            className="ci-card"
                        >
                            <span
                                className="ci-card-dot"
                                style={{ backgroundColor: CIRCLE_COLORS[i % CIRCLE_COLORS.length] }}
                            />
                            <span className="ci-card-name">{c.name}</span>
                            <span className="ci-card-members">
                                {c.member_count} member{c.member_count !== 1 ? "s" : ""}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            <Link href="/friends" className="fr-circles-link">
                <span>Manage Friends</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </Link>
        </div>
    );
}
