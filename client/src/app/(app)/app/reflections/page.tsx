"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { VoiceRecorder } from "@/components/voice-recorder";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const DAILY_PROMPTS = [
  "What challenged your thinking today?",
  "What is one thing you learned that surprised you?",
  "Describe a moment today where you changed your mind.",
  "What assumption did you question today?",
  "What made you curious today?",
  "What perspective did you consider that differs from your own?",
  "What is something you want to understand better?",
  "How did you grow today, even in a small way?",
  "What claim did you see today that you wanted to verify?",
  "What habit are you building, and how did today go?",
];

function getTodaysPrompt(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}

interface PastReflection {
  id: string;
  content: string;
  feedback: string | null;
  created_at: string;
}

export default function ReflectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pastReflections, setPastReflections] = useState<PastReflection[]>([]);
  const [error, setError] = useState("");

  const prompt = getTodaysPrompt();

  useEffect(() => {
    if (!user) return;

    const fetchPast = async () => {
      const { data } = await supabase
        .from("reflections")
        .select("id, content, feedback, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setPastReflections(data || []);
    };

    fetchPast();
  }, [user]);

  const handleTranscription = (text: string) => {
    setContent((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setSubmitting(true);
    setError("");
    setFeedback(null);

    try {
      const serverUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${serverUrl}/api/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          content: content.trim(),
          prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.detail || "Submission failed");
        return;
      }

      setFeedback(data.feedback || "Reflection saved!");
      setContent("");

      const { data: updated } = await supabase
        .from("reflections")
        .select("id, content, feedback, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setPastReflections(updated || []);
    } catch {
      setError("Could not reach server");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <p className="loading-text">Loading...</p>;

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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl text-deep-forest">Reflect</h2>

      <div className="card">
        <p className="reflection-prompt">{prompt}</p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="reflection-input-area">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write or speak your reflection..."
            className="input reflection-textarea"
            rows={5}
          />
          <div className="reflection-actions">
            <VoiceRecorder onTranscription={handleTranscription} />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="btn btn-primary"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
        {error && <p className="error-text" style={{ marginTop: "0.5rem" }}>{error}</p>}
      </form>

      {feedback && (
        <div className="card reflection-feedback">
          <h3 className="card-title">Feedback</h3>
          <p className="reflection-feedback-text">{feedback}</p>
        </div>
      )}

      {pastReflections.length > 0 && (
        <div className="card">
          <h3 className="card-title">Past Reflections</h3>
          <div className="reflection-list">
            {pastReflections.map((r) => (
              <div key={r.id} className="reflection-entry">
                <span className="reflection-date">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
                <p className="reflection-content">{r.content}</p>
                {r.feedback && (
                  <p className="reflection-ai-note">{r.feedback}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
