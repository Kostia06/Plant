"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { awardPoints } from "@/lib/points";
import { useDeviceId } from "@/lib/hooks/use-device-id";
import { earn } from "@/lib/plant-age";

const DAILY_PROMPTS = [
    "What is one thing you learned today that surprised you?",
    "What habit would you like to build this week?",
    "Describe a moment today when you felt genuinely focused.",
    "What is something you believed that turned out to be wrong?",
    "If you could give advice to yourself from last week, what would it be?",
    "What is one thing you spent too much time on today?",
    "Describe a conversation that made you think differently.",
    "What assumption did you challenge recently?",
    "What would your ideal screen-free hour look like?",
    "What is one thing you are grateful for right now?",
    "What decision are you avoiding, and why?",
    "How did you handle a frustrating moment today?",
    "What is one opinion you hold that most people disagree with?",
    "Describe a time you changed your mind about something important.",
    "What is one skill you wish you spent more time developing?",
    "What would you do differently if no one was watching?",
    "What information source do you trust most, and why?",
    "What is one question you wish you had asked today?",
    "How do you know when something you read online is true?",
    "What is the hardest part about putting your phone down?",
    "What did you consume today that made you feel better? Worse?",
    "Describe a moment when you noticed yourself scrolling mindlessly.",
    "What is one boundary you want to set with technology?",
    "What matters more to you: being right or understanding others?",
    "If your screen time disappeared, what would you fill that time with?",
    "What is something you pretend to care about but actually don't?",
    "What was the most intentional choice you made today?",
    "What pattern in your daily routine would you like to break?",
    "When was the last time you sat with your thoughts in silence?",
    "What does a good day look like to you?",
];

const REFLECTION_KEY = "bloom_last_reflection_date";
const MIN_LENGTH = 20;
const POINTS_REWARD = 15;

interface PastReflection {
    id: string;
    prompt: string;
    response: string;
    created_at: string;
}

function getTodayStr(): string {
    return new Date().toISOString().split("T")[0];
}

function getDailyPrompt(): string {
    const today = new Date();
    const dayOfYear = Math.floor(
        (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}

function hasReflectedToday(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(REFLECTION_KEY) === getTodayStr();
}

function markReflectedToday(): void {
    localStorage.setItem(REFLECTION_KEY, getTodayStr());
}

export default function ReflectionsPage() {
    const deviceId = useDeviceId();
    const [response, setResponse] = useState("");
    const [isDone, setIsDone] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pastReflections, setPastReflections] = useState<PastReflection[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [error, setError] = useState("");

    const prompt = getDailyPrompt();
    const charCount = response.trim().length;
    const isValid = charCount >= MIN_LENGTH;

    useEffect(() => {
        setIsDone(hasReflectedToday());
        if (deviceId) loadHistory();
    }, [deviceId]);

    async function loadHistory() {
        const { data } = await supabase
            .from("reflections")
            .select("id, prompt, response, created_at")
            .eq("user_id", deviceId)
            .order("created_at", { ascending: false })
            .limit(10);

        if (data) setPastReflections(data as PastReflection[]);
    }

    async function handleSubmit() {
        if (!isValid || !deviceId || isSubmitting) return;
        setIsSubmitting(true);
        setError("");

        try {
            await supabase.from("reflections").insert({
                user_id: deviceId,
                prompt,
                response: response.trim(),
            });

            await awardPoints(deviceId, "reflection", POINTS_REWARD, "Daily reflection");
            earn(POINTS_REWARD);

            markReflectedToday();
            setIsDone(true);
            await loadHistory();
        } catch {
            setError("Failed to save reflection. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="page-container rf-page">
            <div className="pg-back">
                <Link href="/settings" className="btn-link">
                    &larr; Dashboard
                </Link>
            </div>

            <h1 className="page-title">Daily Reflection</h1>

            {isDone ? (
                <div className="rf-done-card">
                    <span className="rf-done-icon">{"\u2705"}</span>
                    <h2 className="rf-done-title">Reflected today!</h2>
                    <p className="rf-done-sub">+{POINTS_REWARD} Plant Minutes earned</p>
                    <p className="rf-done-hint">Come back tomorrow for a new prompt</p>
                </div>
            ) : (
                <div className="rf-write-section">
                    <div className="rf-prompt-card">
                        <span className="rf-prompt-icon">{"\uD83D\uDCAD"}</span>
                        <p className="rf-prompt-text">{prompt}</p>
                    </div>

                    <textarea
                        className="rf-textarea"
                        placeholder="Write your thoughts..."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        rows={5}
                    />

                    <div className="rf-meta-row">
                        <span className={`rf-char-count ${isValid ? "rf-char-count--valid" : ""}`}>
                            {charCount}/{MIN_LENGTH} min
                        </span>
                        <span className="rf-reward">+{POINTS_REWARD} PM</span>
                    </div>

                    {error && <p className="error-text">{error}</p>}

                    <button
                        className="btn btn-primary rf-submit-btn"
                        disabled={!isValid || isSubmitting}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? "Saving..." : "Submit Reflection"}
                    </button>
                </div>
            )}

            {pastReflections.length > 0 && (
                <div className="rf-history-section">
                    <button
                        className="btn-link"
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        {showHistory ? "Hide" : "Show"} past reflections ({pastReflections.length})
                    </button>

                    {showHistory && (
                        <div className="rf-history-list">
                            {pastReflections.map((r) => (
                                <div key={r.id} className="rf-history-card">
                                    <p className="rf-history-prompt">{r.prompt}</p>
                                    <p className="rf-history-response">{r.response}</p>
                                    <span className="rf-history-date">
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
