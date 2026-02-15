"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { TREE_ICONS } from "@/lib/pixel-icons";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Friend {
  id: string;
  displayName: string;
  score: number;
  treeState: string;
}

interface PendingRequest {
  id: string;
  senderName: string;
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [friendId, setFriendId] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;

    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted");

    const friendIds = (friendships || []).map((f) =>
      f.user_id === user.id ? f.friend_id : f.user_id,
    );

    if (friendIds.length > 0) {
      const [{ data: profiles }, { data: scores }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", friendIds),
        supabase.from("user_scores").select("user_id, current_score, tree_state").in("user_id", friendIds),
      ]);

      const scoreMap = new Map((scores || []).map((s) => [s.user_id, s]));
      const list: Friend[] = (profiles || []).map((p) => {
        const s = scoreMap.get(p.id);
        return {
          id: p.id,
          displayName: p.display_name,
          score: s?.current_score ?? 0,
          treeState: s?.tree_state ?? "seedling",
        };
      });
      setFriends(list);
    }

    setLoading(false);
  };

  const fetchPending = async () => {
    if (!user) return;

    const { data: rows } = await supabase
      .from("friendships")
      .select("id, user_id")
      .eq("friend_id", user.id)
      .eq("status", "pending");

    if (!rows || rows.length === 0) { setPending([]); return; }

    const senderIds = rows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", senderIds);

    const nameMap = new Map((profiles || []).map((p) => [p.id, p.display_name]));
    setPending(rows.map((r) => ({ id: r.id, senderName: nameMap.get(r.user_id) || "Unknown" })));
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchFriends();
      fetchPending();
    }
  }, [authLoading, user]);

  const addFriend = async () => {
    if (!friendId.trim() || !user) return;
    setMessage("");
    const { error } = await supabase
      .from("friendships")
      .insert({ user_id: user.id, friend_id: friendId.trim(), status: "pending" });
    setMessage(error ? error.message : "Request sent!");
    setFriendId("");
  };

  const respondToRequest = async (id: string, accept: boolean) => {
    await supabase
      .from("friendships")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", id);
    fetchPending();
    if (accept) fetchFriends();
  };

  const copyId = async () => {
    if (!user) return;
    await navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) return <p className="loading-text">Loading...</p>;

  if (!user) {
    return (
      <div className="page-center">
        <div className="card">
          <h2 className="card-title">Login Required</h2>
          <Link href="/app/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-deep-forest">Friends</h2>
        <Link href="/app/leaderboard" className="btn btn-sm btn-primary">
          [^] Ranks
        </Link>
      </div>

      <div className="card">
        <p className="card-subtitle">Share your ID so friends can add you:</p>
        <div className="user-id-row">
          <code className="user-id-value">{user.id.slice(0, 8)}...{user.id.slice(-4)}</code>
          <button onClick={copyId} className="btn btn-sm btn-copy">{copied ? "Copied!" : "Copy Full ID"}</button>
        </div>
      </div>

      <div className="card card-add-friend">
        <h3>Add a Friend</h3>
        <div className="add-friend-row">
          <input type="text" placeholder="Paste friend's user ID" value={friendId} onChange={(e) => setFriendId(e.target.value)} className="input" />
          <button onClick={addFriend} className="btn btn-primary btn-sm">Add</button>
        </div>
        {message && <p className="feed-points" style={{ marginTop: "0.5rem" }}>{message}</p>}
      </div>

      {pending.length > 0 && (
        <div className="card">
          <h3 className="card-title">Pending Requests ({pending.length})</h3>
          {pending.map((req) => (
            <div key={req.id} className="pending-row">
              <span>{req.senderName}</span>
              <div className="pending-actions">
                <button onClick={() => respondToRequest(req.id, true)} className="btn btn-accept btn-sm">Accept</button>
                <button onClick={() => respondToRequest(req.id, false)} className="btn btn-decline btn-sm">Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="loading-text">Loading friends...</p>
      ) : friends.length === 0 ? (
        <div className="card"><p className="card-subtitle">No friends yet. Share your ID or add someone!</p></div>
      ) : (
        <div className="card">
          <h3 className="card-title">Friends ({friends.length})</h3>
          <div className="leaderboard-table">
            {friends.map((f) => (
              <Link key={f.id} href={`/app/profile/${f.id}`} className="leaderboard-row">
                <span className="lb-tree px-icon">{TREE_ICONS[f.treeState] || ".:."}</span>
                <span className="lb-name">{f.displayName}</span>
                <span className="lb-score">{f.score} pts</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
