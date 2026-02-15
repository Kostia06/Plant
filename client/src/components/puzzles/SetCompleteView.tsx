import type { PuzzleForClient } from "./types";

interface SetCompleteViewProps {
  puzzles: PuzzleForClient[];
  totalPoints: number;
  topicName: string;
  onTryAnotherTopic: () => void;
  onBackToDashboard: () => void;
}

export function SetCompleteView({
  puzzles,
  totalPoints,
  topicName,
  onTryAnotherTopic,
  onBackToDashboard,
}: SetCompleteViewProps) {
  const correctCount = puzzles.filter((p) => p.is_correct).length;
  const emoji = correctCount === 3 ? "\uD83C\uDF1F" : correctCount >= 2 ? "\uD83C\uDF31" : "\uD83C\uDF3F";

  return (
    <div className="tz-complete-view">
      <div className="tz-complete-card">
        <span className="tz-complete-emoji">{emoji}</span>
        <h2 className="tz-complete-title">Set Complete!</h2>
        <p className="tz-complete-topic">{topicName}</p>

        <div className="tz-complete-stats">
          <div className="tz-stat">
            <span className="tz-stat-value">{correctCount}/3</span>
            <span className="tz-stat-label">Correct</span>
          </div>
          <div className="tz-stat">
            <span className="tz-stat-value tz-stat-value--gold">+{totalPoints}</span>
            <span className="tz-stat-label">Points</span>
          </div>
        </div>
      </div>

      <div className="tz-results-list">
        {puzzles.map((puzzle, i) => (
          <div key={puzzle.id} className="tz-result-row">
            <span className={puzzle.is_correct ? "tz-dot--correct" : "tz-dot--wrong"} />
            <span className="tz-result-question">
              {i + 1}. {puzzle.question.slice(0, 70)}...
            </span>
            <span className="tz-result-points">
              +{puzzle.points_earned ?? 0}
            </span>
          </div>
        ))}
      </div>

      <div className="tz-complete-actions">
        <button
          className="btn btn-primary"
          onClick={onTryAnotherTopic}
        >
          Another Topic
        </button>
        <button
          className="btn tz-btn-secondary"
          onClick={onBackToDashboard}
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}
