"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { TREE_ICONS } from "@/lib/pixel-icons";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface UserScore {
  current_score: number;
  tree_state: string;
  streak_days: number;
  total_analyses: number;
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [score, setScore] = useState<UserScore | null>(null);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [displayName, setDisplayName] = useState("Anon");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const [scoreRes, profileRes, activityRes] = await Promise.all([
        supabase.from("user_scores").select("*").eq("user_id", user.id).single(),
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        supabase.from("activity_log").select("points, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(365),
      ]);

      setScore(scoreRes.data);
      setDisplayName(profileRes.data?.display_name ?? "Anon");

      const daily: Record<string, number> = {};
      for (const a of activityRes.data || []) {
        const day = a.created_at.slice(0, 10);
        daily[day] = (daily[day] || 0) + a.points;
      }
      setHeatmapData(daily);
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const copyId = async () => {
    if (!user) return;
    await navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return <p className="loading-text">Loading...</p>;
  }

  if (!user) {
    return (
      <div className="page-center">
        <div className="card">
          <h2 className="card-title">Login Required</h2>
          <Link href="/app/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const treeState = score?.tree_state || "seedling";

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl text-deep-forest">My Progress</h2>

      <div className="card profile-header">
        <div className="profile-avatar px-icon">
          {TREE_ICONS[treeState]}
        </div>
        <div className="profile-info">
          <h3 className="profile-name">{displayName}</h3>
          <div className="user-id-row">
            <span className="user-id-label">ID:</span>
            <code className="user-id-value">
              {user.id.slice(0, 8)}...{user.id.slice(-4)}
            </code>
            <button onClick={copyId} className="btn btn-sm btn-copy">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="profile-stats" style={{ marginTop: "0.75rem" }}>
            <div className="stat-block">
              <span className="stat-value">{score?.current_score ?? 0}</span>
              <span className="stat-label">Score</span>
            </div>
            <div className="stat-block">
              <span className="stat-value">{score?.streak_days ?? 0}</span>
              <span className="stat-label">Streak</span>
            </div>
            <div className="stat-block">
              <span className="stat-value">{score?.total_analyses ?? 0}</span>
              <span className="stat-label">Analyses</span>
            </div>
            <div className="stat-block">
              <span className="stat-value px-icon">{TREE_ICONS[treeState]} {treeState}</span>
              <span className="stat-label">Tree</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <ActivityHeatmap data={heatmapData} />
      </div>

      <button onClick={signOut} className="btn btn-decline" style={{ alignSelf: "flex-start" }}>
        Sign Out
      </button>
    </div>
  );
}
