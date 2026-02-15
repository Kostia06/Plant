"use client";

interface FeedItemProps {
    actionType: string;
    description: string;
    points: number;
    createdAt: string;
    displayName?: string;
}

const ACTION_EMOJI: Record<string, string> = {
    analysis: "🔍",
    reflection: "📝",
    goal: "🎯",
    brain_teaser: "🧩",
    focus_session: "⏱️",
};

const ACTION_LABEL: Record<string, string> = {
    analysis: "fact-checked a video",
    reflection: "completed a reflection",
    goal: "completed a goal",
    brain_teaser: "solved a brain teaser",
    focus_session: "finished a focus session",
};

export default function FeedItem({
    actionType,
    description,
    points,
    createdAt,
    displayName,
}: FeedItemProps) {
    const emoji = ACTION_EMOJI[actionType] || "✨";
    const label = ACTION_LABEL[actionType] || actionType;
    const name = displayName || "Someone";
    const ago = timeAgo(createdAt);

    return (
        <div className="feed-item">
            <span className="feed-emoji">{emoji}</span>
            <div className="feed-body">
                <p className="feed-text">
                    <strong>{name}</strong> {label}
                    {description && (
                        <span className="feed-desc"> — {description}</span>
                    )}
                </p>
                <div className="feed-meta">
                    <span className="feed-points">+{points} pts</span>
                    <span className="feed-time">{ago}</span>
                </div>
            </div>
        </div>
    );
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}
