import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { getTopicById, type GeneratedPuzzle } from "./puzzle-topics";
import { getFallbackPuzzles } from "./puzzle-fallbacks";
import { hashText } from "./validators";
import { awardPoints } from "./points";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface StoredPuzzle {
  id: string;
  topic: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  hint?: string;
  success_rate: number;
}

export interface PuzzleSet {
  puzzles: StoredPuzzle[];
  setId: string;
  topic: string;
  date: string;
}

export interface AnswerResult {
  is_correct: boolean;
  correct_index: number;
  explanation: string;
  points_earned: number;
  time_taken_seconds: number;
  new_total_correct: number;
  new_total_attempted: number;
  category_stats: { attempted: number; correct: number };
  new_score: number;
  tree_state: string;
}

export interface PuzzleHistory {
  recent_attempts: Array<{
    puzzle_id: string;
    question: string;
    topic: string;
    category: string;
    difficulty: string;
    user_answer: number;
    correct_index: number;
    is_correct: boolean;
    points_earned: number;
    time_taken_seconds: number;
    answered_at: string;
  }>;
  stats: {
    total_attempted: number;
    total_correct: number;
    accuracy: number;
    total_points: number;
    avg_time_seconds: number;
    best_category: string | null;
    worst_category: string | null;
    category_breakdown: Array<{
      category: string;
      attempted: number;
      correct: number;
      accuracy: number;
    }>;
  };
}

export interface PuzzleDailyLimits {
  id: string;
  user_id: string;
  limit_date: string;
  daily_puzzles_attempted: number;
  custom_puzzles_generated: number;
  custom_puzzles_attempted: number;
  hints_used: number;
}

const MAX_ANSWER_TIME_S = 180;
const DAILY_PUZZLE_CAP = 3;
const CUSTOM_GEN_CAP = 5;
const CUSTOM_ATTEMPT_CAP = 10;
const HINTS_CAP = 3;

// ── Daily Limits ──────────────────────────────────────────────

export async function getOrCreatePuzzleDailyLimits(
  userId: string,
): Promise<PuzzleDailyLimits> {
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("puzzle_daily_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("limit_date", today)
    .single();

  if (existing) return existing as PuzzleDailyLimits;

  const { data: created, error } = await supabase
    .from("puzzle_daily_limits")
    .insert({ user_id: userId, limit_date: today })
    .select()
    .single();

  if (error) {
    const { data: retry } = await supabase
      .from("puzzle_daily_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("limit_date", today)
      .single();
    return retry as PuzzleDailyLimits;
  }

  return created as PuzzleDailyLimits;
}

// ── Gemini Generation ─────────────────────────────────────────

function buildPrompt(topicName: string, context: string, categories: string[], count: number, difficulty: string): string {
  const diffNote = difficulty === "mixed"
    ? "Generate 1 easy, 1 medium, and 1 hard puzzle."
    : `All puzzles should be ${difficulty} difficulty.`;

  return `You are a puzzle master for Bloom, an app that builds critical thinking skills.

Generate exactly ${count} multiple-choice puzzles about: "${topicName}"
Context: ${context}

Difficulty guidelines:
- easy: Solvable in 15-30 seconds. Clear, straightforward.
- medium: Requires 30-60 seconds. Has a trick or nuance.
- hard: Requires 60-90 seconds. Multi-step reasoning or subtle insight needed.
${diffNote}

Categories to use: ${categories.join(", ")}

Each puzzle MUST have:
- question: Clear, concise (max 250 chars). No ambiguity.
- options: Exactly 4 choices. All plausible. Only 1 correct.
- correct_index: 0-3, the index of the correct answer
- explanation: Educational explanation (max 200 chars)
- hint: A subtle nudge without giving away the answer (max 100 chars)
- category: One of ${categories.join(", ")}
- tags: 2-3 keyword tags

RULES:
- Questions must be self-contained
- Wrong options must be genuinely plausible
- Never reference specific real people or current events
- Each puzzle must test a different concept

Respond ONLY with a valid JSON array. No markdown, no backticks:
[{"category":"...","difficulty":"...","question":"...","options":["A","B","C","D"],"correct_index":1,"explanation":"...","hint":"...","tags":["tag1","tag2"]}]`;
}

function parseGeminiJson(text: string): GeneratedPuzzle[] {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.split("\n").slice(1).join("\n").replace(/```$/g, "");
  }
  return JSON.parse(cleaned.trim());
}

function isValidPuzzle(p: GeneratedPuzzle): boolean {
  return (
    typeof p.question === "string" &&
    p.question.length > 0 &&
    Array.isArray(p.options) &&
    p.options.length === 4 &&
    p.options.every((o) => typeof o === "string" && o.length > 0) &&
    typeof p.correct_index === "number" &&
    p.correct_index >= 0 &&
    p.correct_index <= 3 &&
    typeof p.explanation === "string" &&
    typeof p.hint === "string" &&
    typeof p.category === "string" &&
    Array.isArray(p.tags)
  );
}

export async function generatePuzzlesForTopic(
  topicId: string,
  count: number,
  difficulty: "easy" | "medium" | "hard" | "mixed",
): Promise<GeneratedPuzzle[]> {
  const topic = getTopicById(topicId);
  if (!topic) throw new Error(`Unknown topic: ${topicId}`);

  let puzzles: GeneratedPuzzle[];

  try {
    const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = buildPrompt(topic.name, topic.sampleContext, topic.categories, count, difficulty);
    const result = await model.generateContent(prompt);
    const parsed = parseGeminiJson(result.response.text());

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Empty response from Gemini");
    }

    puzzles = parsed.filter(isValidPuzzle).map((p) => ({ ...p, topic: topicId }));

    if (puzzles.length === 0) throw new Error("No valid puzzles from Gemini");
  } catch (error) {
    console.error("Gemini puzzle generation failed, using fallbacks:", error);
    puzzles = getFallbackPuzzles(topicId, count, difficulty);
  }

  const stored: GeneratedPuzzle[] = [];

  for (const puzzle of puzzles) {
    const qHash = hashText(puzzle.question);

    const { data: existing } = await supabase
      .from("puzzles")
      .select("id")
      .eq("question_hash", qHash)
      .single();

    if (existing) continue;

    const { error } = await supabase.from("puzzles").insert({
      topic: topicId,
      category: puzzle.category,
      difficulty: puzzle.difficulty,
      question: puzzle.question,
      question_hash: qHash,
      options: puzzle.options,
      correct_index: puzzle.correct_index,
      explanation: puzzle.explanation,
      hint: puzzle.hint,
      tags: puzzle.tags,
    });

    if (!error) stored.push(puzzle);
  }

  return stored.length > 0 ? stored : puzzles;
}

// ── Daily Set ─────────────────────────────────────────────────

export async function generateDailySet(topicId: string): Promise<PuzzleSet> {
  const today = new Date().toISOString().split("T")[0];

  const { data: existingSet } = await supabase
    .from("daily_puzzle_sets")
    .select("*")
    .eq("puzzle_date", today)
    .eq("topic", topicId)
    .eq("difficulty", "mixed")
    .single();

  if (existingSet) {
    const ids = existingSet.puzzle_ids as string[];
    const { data: puzzles } = await supabase
      .from("puzzles")
      .select("*")
      .in("id", ids);

    return {
      puzzles: (puzzles || []).map(stripPuzzleAnswers),
      setId: existingSet.id,
      topic: topicId,
      date: today,
    };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];

  const { data: recentSets } = await supabase
    .from("daily_puzzle_sets")
    .select("puzzle_ids")
    .gte("puzzle_date", thirtyDaysAgo);

  const usedIds = new Set<string>();
  for (const set of recentSets || []) {
    for (const id of set.puzzle_ids as string[]) {
      usedIds.add(id);
    }
  }

  const { data: allCached } = await supabase
    .from("puzzles")
    .select("*")
    .eq("topic", topicId);

  const available = (allCached || []).filter((p) => !usedIds.has(p.id));
  const shuffled = available.sort(() => Math.random() - 0.5);
  let picked = shuffled.slice(0, 3);

  if (picked.length < 3) {
    await generatePuzzlesForTopic(topicId, 5, "mixed");
    const { data: refreshed } = await supabase
      .from("puzzles")
      .select("*")
      .eq("topic", topicId);
    const refreshAvailable = (refreshed || []).filter((p) => !usedIds.has(p.id));
    picked = refreshAvailable.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  if (picked.length === 0) {
    const fallbacks = getFallbackPuzzles(topicId, 3, "mixed");
    for (const fb of fallbacks) {
      const qHash = hashText(fb.question);
      const { data } = await supabase
        .from("puzzles")
        .upsert({ topic: topicId, category: fb.category, difficulty: fb.difficulty, question: fb.question, question_hash: qHash, options: fb.options, correct_index: fb.correct_index, explanation: fb.explanation, hint: fb.hint, tags: fb.tags }, { onConflict: "question_hash" })
        .select()
        .single();
      if (data) picked.push(data);
    }
  }

  const puzzleIds = picked.map((p) => p.id);

  const { data: newSet } = await supabase
    .from("daily_puzzle_sets")
    .insert({ puzzle_date: today, difficulty: "mixed", topic: topicId, puzzle_ids: puzzleIds })
    .select()
    .single();

  return {
    puzzles: picked.map(stripPuzzleAnswers),
    setId: newSet?.id ?? "",
    topic: topicId,
    date: today,
  };
}

// ── Custom Generation ─────────────────────────────────────────

export async function generateCustomPuzzles(
  userId: string,
  topicId: string,
  difficulty: "easy" | "medium" | "hard" | "mixed",
  count: number,
): Promise<StoredPuzzle[]> {
  const { data: attempts } = await supabase
    .from("puzzle_attempts")
    .select("puzzle_id")
    .eq("user_id", userId);

  const attemptedIds = new Set((attempts || []).map((a) => a.puzzle_id));

  const query = supabase.from("puzzles").select("*").eq("topic", topicId);
  if (difficulty !== "mixed") query.eq("difficulty", difficulty);

  const { data: cached } = await query;
  const unseen = (cached || []).filter((p) => !attemptedIds.has(p.id));

  if (unseen.length >= count) {
    const shuffled = unseen.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(stripPuzzleAnswers);
  }

  await generatePuzzlesForTopic(topicId, count + 2, difficulty);

  const { data: refreshed } = await supabase
    .from("puzzles")
    .select("*")
    .eq("topic", topicId);
  const newUnseen = (refreshed || [])
    .filter((p) => !attemptedIds.has(p.id))
    .sort(() => Math.random() - 0.5);

  return newUnseen.slice(0, count).map(stripPuzzleAnswers);
}

// ── Answer Submission ─────────────────────────────────────────

export async function submitAnswer(
  userId: string,
  puzzleId: string,
  userAnswer: number,
  startedAt: string,
  hintUsed: boolean,
): Promise<AnswerResult> {
  const { data: puzzle } = await supabase
    .from("puzzles")
    .select("*")
    .eq("id", puzzleId)
    .single();

  if (!puzzle) throw new Error("Puzzle not found");

  const startMs = new Date(startedAt).getTime();
  const timeTaken = Math.floor((Date.now() - startMs) / 1000);

  if (timeTaken > MAX_ANSWER_TIME_S) {
    throw new Error("Answer time expired");
  }

  const isCorrect = userAnswer === puzzle.correct_index;
  let basePoints = isCorrect ? (hintUsed ? 5 : 8) : 2;
  if (isCorrect && !hintUsed && timeTaken < 15) basePoints += 2;

  const { error: insertError } = await supabase.from("puzzle_attempts").insert({
    user_id: userId,
    puzzle_id: puzzleId,
    user_answer: userAnswer,
    is_correct: isCorrect,
    time_taken_seconds: timeTaken,
    hint_used: hintUsed,
    points_earned: basePoints,
    started_at: startedAt,
    answered_at: new Date().toISOString(),
  });

  if (insertError) {
    if (insertError.code === "23505") throw new Error("DUPLICATE");
    throw insertError;
  }

  const scoreResult = await awardPoints(
    userId,
    "puzzle",
    basePoints,
    isCorrect ? "Puzzle answered correctly" : "Puzzle attempted",
    puzzleId,
  );

  await supabase.rpc("update_user_puzzle_stats", { uid: userId });

  const { data: stats } = await supabase
    .from("puzzle_stats")
    .select("total_attempted, total_correct")
    .eq("user_id", userId)
    .single();

  const catAttemptedKey = `${puzzle.category}_attempted`;
  const catCorrectKey = `${puzzle.category}_correct`;

  const { data: catStats } = await supabase
    .from("puzzle_stats")
    .select(`${catAttemptedKey}, ${catCorrectKey}`)
    .eq("user_id", userId)
    .single();

  const catRow = catStats as Record<string, number> | null;

  return {
    is_correct: isCorrect,
    correct_index: puzzle.correct_index,
    explanation: puzzle.explanation,
    points_earned: scoreResult.points_awarded,
    time_taken_seconds: timeTaken,
    new_total_correct: stats?.total_correct ?? 0,
    new_total_attempted: stats?.total_attempted ?? 0,
    category_stats: {
      attempted: catRow?.[catAttemptedKey] ?? 0,
      correct: catRow?.[catCorrectKey] ?? 0,
    },
    new_score: scoreResult.new_score,
    tree_state: scoreResult.tree_state,
  };
}

// ── Hints ─────────────────────────────────────────────────────

export async function getHint(
  userId: string,
  puzzleId: string,
): Promise<{ hint: string; hints_remaining: number }> {
  const limits = await getOrCreatePuzzleDailyLimits(userId);

  if (limits.hints_used >= HINTS_CAP) {
    throw new Error("HINT_LIMIT");
  }

  const { data: attempted } = await supabase
    .from("puzzle_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("puzzle_id", puzzleId)
    .single();

  if (attempted) throw new Error("ALREADY_ATTEMPTED");

  const { data: puzzle } = await supabase
    .from("puzzles")
    .select("hint")
    .eq("id", puzzleId)
    .single();

  if (!puzzle) throw new Error("Puzzle not found");

  await supabase
    .from("puzzle_daily_limits")
    .update({ hints_used: limits.hints_used + 1 })
    .eq("id", limits.id);

  return {
    hint: puzzle.hint ?? "Think carefully about each option.",
    hints_remaining: HINTS_CAP - limits.hints_used - 1,
  };
}

// ── History & Stats ───────────────────────────────────────────

const PUZZLE_CATEGORIES_LIST = [
  "logic", "math", "critical_thinking", "media_literacy",
  "statistics", "cognitive_bias", "scientific_reasoning",
  "ethical_dilemma", "pattern_recognition", "wordplay",
];

export async function getUserPuzzleHistory(
  userId: string,
  limit: number,
): Promise<PuzzleHistory> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const { data: attempts } = await supabase
    .from("puzzle_attempts")
    .select("puzzle_id, user_answer, is_correct, points_earned, time_taken_seconds, answered_at")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(safeLimit);

  const puzzleIds = (attempts || []).map((a) => a.puzzle_id);
  const { data: puzzles } = puzzleIds.length > 0
    ? await supabase.from("puzzles").select("id, question, topic, category, difficulty, correct_index").in("id", puzzleIds)
    : { data: [] };

  const puzzleMap = new Map((puzzles || []).map((p) => [p.id, p]));

  const recentAttempts = (attempts || []).map((a) => {
    const p = puzzleMap.get(a.puzzle_id);
    return {
      puzzle_id: a.puzzle_id,
      question: p?.question ?? "",
      topic: p?.topic ?? "",
      category: p?.category ?? "",
      difficulty: p?.difficulty ?? "",
      user_answer: a.user_answer,
      correct_index: p?.correct_index ?? 0,
      is_correct: a.is_correct,
      points_earned: a.points_earned,
      time_taken_seconds: a.time_taken_seconds ?? 0,
      answered_at: a.answered_at,
    };
  });

  const { data: stats } = await supabase
    .from("puzzle_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  const breakdown = PUZZLE_CATEGORIES_LIST.map((cat) => {
    const att = (stats?.[`${cat}_attempted`] as number) ?? 0;
    const cor = (stats?.[`${cat}_correct`] as number) ?? 0;
    return { category: cat, attempted: att, correct: cor, accuracy: att > 0 ? Math.round((cor / att) * 1000) / 10 : 0 };
  });

  const totalAtt = stats?.total_attempted ?? 0;
  const totalCor = stats?.total_correct ?? 0;

  return {
    recent_attempts: recentAttempts,
    stats: {
      total_attempted: totalAtt,
      total_correct: totalCor,
      accuracy: totalAtt > 0 ? Math.round((totalCor / totalAtt) * 1000) / 10 : 0,
      total_points: stats?.total_points ?? 0,
      avg_time_seconds: Math.round((stats?.avg_time_seconds ?? 0) * 10) / 10,
      best_category: stats?.best_category ?? null,
      worst_category: stats?.worst_category ?? null,
      category_breakdown: breakdown,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────

function stripPuzzleAnswers(row: Record<string, unknown>): StoredPuzzle {
  return {
    id: row.id as string,
    topic: row.topic as string,
    category: row.category as string,
    difficulty: row.difficulty as string,
    question: row.question as string,
    options: row.options as string[],
    hint: row.hint as string | undefined,
    success_rate: (row.success_rate as number) ?? 0,
  };
}

export { DAILY_PUZZLE_CAP, CUSTOM_GEN_CAP, CUSTOM_ATTEMPT_CAP, HINTS_CAP };
