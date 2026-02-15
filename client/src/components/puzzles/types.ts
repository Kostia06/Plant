export type { PuzzleForClient } from "@/lib/puzzle-engine";

export type PuzzlePhase =
  | "topic-select"
  | "loading"
  | "playing"
  | "set-complete"
  | "error";

export interface PuzzleLimits {
  daily_puzzles_attempted: number;
  daily_puzzles_remaining: number;
  custom_puzzles_generated: number;
  custom_puzzles_remaining: number;
  hints_used: number;
  hints_remaining: number;
}

export interface TopicStat {
  topic_id: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface SubmitResultData {
  is_correct: boolean;
  correct_index: number;
  explanation: string;
  points_earned: number;
  time_taken_seconds: number;
  error?: string;
}

export interface HintResultData {
  hint: string;
  hints_remaining: number;
  error?: string;
}

export interface HistoryAttempt {
  id: string;
  puzzle_id: string;
  user_answer: number;
  is_correct: boolean;
  points_earned: number;
  answered_at: string;
  puzzles: {
    question: string;
    topic: string;
    difficulty: string;
  };
}
