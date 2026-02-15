"use client";

import type { AnalysisHistoryItem, AnalysisResult } from "./types";

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

interface HistoryTag {
  label: string;
  className: string;
}

function getHistoryTag(item: AnalysisHistoryItem): HistoryTag {
  if (item.points_awarded === 0) {
    return { label: "Brainrot", className: "va-tag--brainrot" };
  }
  const bias = item.bias_analysis?.overall_bias?.toLowerCase() ?? "";
  if (bias.includes("left")) {
    return { label: "Left", className: "va-tag--left" };
  }
  if (bias.includes("right")) {
    return { label: "Right", className: "va-tag--right" };
  }
  return { label: "Center", className: "va-tag--center" };
}

function historyItemToResult(item: AnalysisHistoryItem): AnalysisResult {
  return {
    title: item.title ?? "Untitled",
    platform: item.platform ?? "",
    duration_seconds: item.duration_seconds,
    summary: item.summary ?? "",
    transcript: item.transcript ?? "",
    claims: item.claims ?? [],
    perspectives: item.perspectives ?? { left: "", center: "", right: "" },
    bias_analysis: item.bias_analysis ?? {
      overall_bias: "unknown",
      manipulation_tactics: [],
      misleading_visuals: [],
    },
    points_awarded: item.points_awarded ?? 0,
  };
}

function HistoryCard({
  item,
  onSelect,
}: {
  item: AnalysisHistoryItem;
  onSelect: () => void;
}) {
  const tag = getHistoryTag(item);
  const isBrainrot = item.points_awarded === 0;

  return (
    <button className="va-history-card" onClick={onSelect}>
      <div className="va-history-card-top">
        <span className="va-history-title">
          {item.title ?? "Untitled"}
        </span>
        <span className="va-history-date">
          {relativeDate(item.created_at)}
        </span>
      </div>
      <div className="va-history-card-bottom">
        <span className={`va-tag ${tag.className}`}>{tag.label}</span>
        {isBrainrot ? (
          <span className="va-history-points">0 PM</span>
        ) : (
          item.summary && (
            <span className="va-history-summary">
              {truncate(item.summary, 80)}
            </span>
          )
        )}
      </div>
    </button>
  );
}

interface IdleViewProps {
  url: string;
  onUrlChange: (v: string) => void;
  onSubmit: () => void;
  history: AnalysisHistoryItem[];
  isHistoryLoading: boolean;
  onSelectHistory: (result: AnalysisResult) => void;
}

export function IdleView({
  url,
  onUrlChange,
  onSubmit,
  history,
  isHistoryLoading,
  onSelectHistory,
}: IdleViewProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSubmit();
  };

  return (
    <div className="va-idle">
      <div className="va-input-group">
        <input
          type="url"
          className="input va-url-input"
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button
          className="btn btn-primary va-submit-btn"
          onClick={onSubmit}
          disabled={!url.trim()}
        >
          Analyze
        </button>
      </div>
      <p className="va-helper">
        Paste a YouTube, TikTok, or Instagram link
      </p>

      <div className="va-history-section">
        <h3 className="va-section-title">Past Analyses</h3>
        {isHistoryLoading && (
          <p className="va-history-empty">Loading...</p>
        )}
        {!isHistoryLoading && history.length === 0 && (
          <p className="va-history-empty">No analyses yet</p>
        )}
        {!isHistoryLoading && history.length > 0 && (
          <div className="va-history-list">
            {history.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onSelect={() => onSelectHistory(historyItemToResult(item))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
