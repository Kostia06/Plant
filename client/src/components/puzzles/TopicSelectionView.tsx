import { useState } from "react";
import { PUZZLE_TOPICS } from "@/lib/puzzle-topics";
import type { PuzzleLimits, TopicStat, HistoryAttempt } from "./types";

interface TopicSelectionViewProps {
  limits: PuzzleLimits;
  topicStats: TopicStat[];
  recommendedTopicId: string;
  isLoading: boolean;
  history: HistoryAttempt[];
  onSelectTopic: (topicId: string) => void;
}

export function TopicSelectionView({
  limits,
  topicStats,
  recommendedTopicId,
  isLoading,
  history,
  onSelectTopic,
}: TopicSelectionViewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const isCapReached = limits.daily_puzzles_remaining <= 0;

  function getStatLine(topicId: string): string {
    const stat = topicStats.find((s) => s.topic_id === topicId);
    if (!stat || stat.attempted === 0) return "No attempts yet";
    return `${stat.correct}/${stat.attempted} correct`;
  }

  return (
    <div className="tz-topic-view">
      <div className="tz-limits-bar">
        <span>
          {limits.daily_puzzles_attempted}/3 daily puzzles used
        </span>
        <div className="tz-limits-track">
          <div
            className="tz-limits-fill"
            style={{ width: `${(limits.daily_puzzles_attempted / 3) * 100}%` }}
          />
        </div>
      </div>

      {isCapReached && (
        <div className="tz-cap-banner">
          Daily puzzle limit reached. Come back tomorrow!
        </div>
      )}

      <div className="tz-topic-grid">
        {PUZZLE_TOPICS.map((topic) => {
          const isRecommended = topic.id === recommendedTopicId;
          return (
            <button
              key={topic.id}
              className={`tz-topic-card ${isRecommended ? "tz-topic-card--recommended" : ""}`}
              disabled={isCapReached || isLoading}
              onClick={() => onSelectTopic(topic.id)}
            >
              <div className="tz-topic-card-header">
                <span className="tz-topic-icon">{topic.icon}</span>
                <span className="tz-topic-name">{topic.name}</span>
              </div>
              <span className="tz-topic-stat">{getStatLine(topic.id)}</span>
              {isRecommended && (
                <span className="tz-recommended-badge">Recommended</span>
              )}
            </button>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="tz-history-section">
          <button
            className="btn-link"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? "Hide" : "Show"} recent attempts
          </button>

          {showHistory && (
            <div className="tz-history-list">
              {history.map((attempt) => (
                <div key={attempt.id} className="tz-history-item">
                  <span className={attempt.is_correct ? "tz-dot--correct" : "tz-dot--wrong"} />
                  <span className="tz-history-question">
                    {attempt.puzzles.question.slice(0, 60)}...
                  </span>
                  <span className="tz-history-points">+{attempt.points_earned}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
