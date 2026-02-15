import { useState } from "react";
import type { PuzzleForClient, SubmitResultData } from "./types";

const LETTERS = ["A", "B", "C", "D"];

interface PuzzlePlayViewProps {
  puzzle: PuzzleForClient;
  puzzleNumber: number;
  totalPuzzles: number;
  startedAt: string;
  hintsRemaining: number;
  onSubmitAnswer: (
    puzzleId: string,
    answer: number,
    startedAt: string,
    hintUsed: boolean,
  ) => Promise<SubmitResultData>;
  onRequestHint: (puzzleId: string) => Promise<{ hint: string; error?: string }>;
  onNext: () => void;
}

export function PuzzlePlayView({
  puzzle,
  puzzleNumber,
  totalPuzzles,
  startedAt,
  hintsRemaining,
  onSubmitAnswer,
  onRequestHint,
  onNext,
}: PuzzlePlayViewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResultData | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasResult = result !== null;

  async function handleSubmit() {
    if (selectedIndex === null || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await onSubmitAnswer(puzzle.id, selectedIndex, startedAt, hintUsed);
      setResult(res);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleHint() {
    if (hintUsed || hintsRemaining <= 0) return;

    const res = await onRequestHint(puzzle.id);
    if (!res.error) {
      setHintText(res.hint);
      setHintUsed(true);
    }
  }

  function getOptionClass(index: number): string {
    const base = "ch-option";
    if (!hasResult) {
      return index === selectedIndex ? `${base} ch-option--selected` : base;
    }
    if (index === result.correct_index) return `${base} ch-option--correct`;
    if (index === selectedIndex && !result.is_correct) return `${base} ch-option--wrong`;
    return base;
  }

  return (
    <div className="tz-play-view">
      <div className="tz-progress-dots">
        {Array.from({ length: totalPuzzles }, (_, i) => {
          let dotClass = "tz-dot";
          if (i < puzzleNumber - 1) dotClass += " tz-dot--done";
          else if (i === puzzleNumber - 1) dotClass += " tz-dot--active";
          return <span key={i} className={dotClass} />;
        })}
      </div>

      <div className="tz-puzzle-meta">
        <span className="ch-difficulty">{puzzle.difficulty.toUpperCase()}</span>
        <span className="tz-category-tag">{puzzle.category}</span>
      </div>

      <div className="ch-prompt-card">
        <p className="ch-prompt">{puzzle.question}</p>
      </div>

      {!hasResult && hintText && (
        <div className="tz-hint-badge">{hintText}</div>
      )}

      {!hasResult && !hintText && hintsRemaining > 0 && (
        <button className="tz-hint-btn" onClick={handleHint}>
          Use hint ({hintsRemaining} left)
        </button>
      )}

      <div className="ch-options">
        {puzzle.options.map((option, i) => (
          <button
            key={i}
            className={getOptionClass(i)}
            disabled={hasResult}
            onClick={() => !hasResult && setSelectedIndex(i)}
          >
            <span className="ch-option-letter">{LETTERS[i]}</span>
            <span className="ch-option-text">{option}</span>
          </button>
        ))}
      </div>

      {!hasResult && (
        <button
          className="btn btn-primary tz-submit-btn"
          disabled={selectedIndex === null || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "Submitting..." : "Submit Answer"}
        </button>
      )}

      {hasResult && (
        <div className="tz-result-section">
          <div className={`ch-result ${result.is_correct ? "ch-result--correct" : "ch-result--wrong"}`}>
            <span className="ch-result-icon">
              {result.is_correct ? "\u2713" : "\u2717"}
            </span>
            <span>{result.is_correct ? "Correct!" : "Not quite"}</span>
            <span className="tz-points-badge">+{result.points_earned} pts</span>
          </div>

          <p className="tz-explanation">{result.explanation}</p>

          <button className="btn btn-primary tz-next-btn" onClick={onNext}>
            {puzzleNumber < totalPuzzles ? "Next Puzzle" : "View Results"}
          </button>
        </div>
      )}
    </div>
  );
}
