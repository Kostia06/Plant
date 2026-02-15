import { getAllTopicIds } from "./puzzle-topics";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface ValidatedAnswer {
  userId: string;
  puzzleId: string;
  answer: number;
  startedAt: string;
  hintUsed: boolean;
}

interface AnswerValidationResult extends ValidationResult {
  data?: ValidatedAnswer;
}

export function validateTopicId(topicId: string): ValidationResult {
  if (!topicId || typeof topicId !== "string") {
    return { valid: false, error: "topic is required" };
  }
  if (!getAllTopicIds().includes(topicId)) {
    return { valid: false, error: `Invalid topic: ${topicId}` };
  }
  return { valid: true };
}

export function validateDifficulty(difficulty: string): ValidationResult {
  if (!difficulty || typeof difficulty !== "string") {
    return { valid: false, error: "difficulty is required" };
  }
  if (!VALID_DIFFICULTIES.includes(difficulty as (typeof VALID_DIFFICULTIES)[number])) {
    return { valid: false, error: "difficulty must be easy, medium, hard, or mixed" };
  }
  return { valid: true };
}

export function validateAnswerSubmission(
  body: Record<string, unknown>,
): AnswerValidationResult {
  const { user_id, puzzle_id, answer, started_at, hint_used } = body;

  if (!user_id || typeof user_id !== "string" || !UUID_REGEX.test(user_id)) {
    return { valid: false, error: "user_id must be a valid UUID" };
  }
  if (!puzzle_id || typeof puzzle_id !== "string" || !UUID_REGEX.test(puzzle_id)) {
    return { valid: false, error: "puzzle_id must be a valid UUID" };
  }
  if (typeof answer !== "number" || answer < 0 || answer > 3) {
    return { valid: false, error: "answer must be 0, 1, 2, or 3" };
  }
  if (!started_at || typeof started_at !== "string") {
    return { valid: false, error: "started_at timestamp is required" };
  }
  const startedTime = new Date(started_at as string).getTime();
  if (isNaN(startedTime) || startedTime > Date.now()) {
    return { valid: false, error: "Invalid started_at timestamp" };
  }

  return {
    valid: true,
    data: {
      userId: user_id as string,
      puzzleId: puzzle_id as string,
      answer: answer as number,
      startedAt: started_at as string,
      hintUsed: hint_used === true,
    },
  };
}

export function validatePuzzleGeneration(
  body: Record<string, unknown>,
): ValidationResult {
  const { user_id, topic, difficulty } = body;

  if (!user_id || typeof user_id !== "string" || !UUID_REGEX.test(user_id)) {
    return { valid: false, error: "user_id must be a valid UUID" };
  }
  const topicCheck = validateTopicId(topic as string);
  if (!topicCheck.valid) return topicCheck;

  const diffCheck = validateDifficulty(difficulty as string);
  if (!diffCheck.valid) return diffCheck;

  return { valid: true };
}
