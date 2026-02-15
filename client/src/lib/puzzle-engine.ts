import { supabase } from "./supabase";
import { awardPoints } from "./points";
import { getTopicById, getAllTopicIds } from "./puzzle-topics";
import { FALLBACK_PUZZLES, type GeneratedPuzzle } from "./puzzle-fallbacks";

interface UserProfile {
  age?: number | null;
  major?: string | null;
  interests?: string[] | null;
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data } = await supabase
    .from("profiles")
    .select("age, major, interests")
    .eq("id", userId)
    .single();

  return data ?? {};
}

const DAILY_CAP = 3;
const CUSTOM_GEN_CAP = 5;
const HINT_CAP = 3;
const ANSWER_WINDOW_SECONDS = 180;
const POINTS_CORRECT = 8;
const POINTS_CORRECT_HINT = 5;
const POINTS_WRONG = 2;
const POINTS_SPEED_BONUS = 2;
const SPEED_THRESHOLD_SECONDS = 15;

async function hashQuestion(question: string): Promise<string> {
  const data = new TextEncoder().encode(question.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function todayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

interface DBPuzzle {
  id: string;
  topic: string;
  category: string;
  difficulty: string;
  question: string;
  question_hash: string;
  options: string[];
  correct_index: number;
  explanation: string;
  hint: string | null;
  tags: string[];
  times_served: number;
  times_correct: number;
  success_rate: number;
  created_at: string;
}

export interface PuzzleForClient {
  id: string;
  topic: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  tags: string[];
  correct_index?: number;
  explanation?: string;
  hint?: string | null;
  attempted?: boolean;
  user_answer?: number;
  is_correct?: boolean;
  points_earned?: number;
}

async function getDailyLimits(userId: string) {
  const today = todayUTC();
  const { data } = await supabase
    .from("puzzle_daily_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("limit_date", today)
    .single();

  if (data) return data;

  const { data: created } = await supabase
    .from("puzzle_daily_limits")
    .insert({ user_id: userId, limit_date: today })
    .select()
    .single();

  return created ?? {
    daily_puzzles_attempted: 0,
    custom_puzzles_generated: 0,
    custom_puzzles_attempted: 0,
    hints_used: 0,
  };
}

async function incrementDailyLimit(
  userId: string,
  column: string,
  delta = 1,
): Promise<void> {
  const today = todayUTC();
  const limits = await getDailyLimits(userId);
  const currentValue = (limits as Record<string, number>)[column] ?? 0;

  await supabase
    .from("puzzle_daily_limits")
    .update({ [column]: currentValue + delta })
    .eq("user_id", userId)
    .eq("limit_date", today);
}

async function callGemini(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("gemini-proxy", {
    body: { prompt },
  });

  if (error) throw new Error(error.message ?? "Gemini proxy error");
  if (data?.error) throw new Error(data.error);
  return data?.text ?? "";
}

function parseGeminiResponse(raw: string): GeneratedPuzzle[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (p: GeneratedPuzzle) =>
      p.question &&
      Array.isArray(p.options) &&
      p.options.length === 4 &&
      typeof p.correct_index === "number" &&
      p.correct_index >= 0 &&
      p.correct_index <= 3 &&
      p.explanation,
  );
}

async function insertPuzzles(
  topicId: string,
  puzzles: GeneratedPuzzle[],
): Promise<DBPuzzle[]> {
  const rows = await Promise.all(
    puzzles.map(async (p) => ({
      topic: topicId,
      category: p.category,
      difficulty: p.difficulty,
      question: p.question,
      question_hash: await hashQuestion(p.question),
      options: p.options,
      correct_index: p.correct_index,
      explanation: p.explanation,
      hint: p.hint ?? null,
      tags: p.tags ?? [],
    })),
  );

  const inserted: DBPuzzle[] = [];
  for (const row of rows) {
    const { data, error } = await supabase
      .from("puzzles")
      .upsert(row, { onConflict: "question_hash", ignoreDuplicates: true })
      .select()
      .single();

    if (data && !error) inserted.push(data as DBPuzzle);
  }
  return inserted;
}

export async function generatePuzzlesForTopic(
  topicId: string,
  count: number,
  difficulty: string,
  profile?: UserProfile,
): Promise<DBPuzzle[]> {
  const topic = getTopicById(topicId);
  if (!topic) return useFallbacks(topicId, count);

  const difficultyInstruction =
    difficulty === "mixed"
      ? "Generate 1 easy, 1 medium, 1 hard."
      : `All puzzles should be ${difficulty}.`;

  const profileLines: string[] = [];
  if (profile?.age) {
    profileLines.push(
      `The user is ${profile.age} years old. Tailor language, references, and examples to this age group.`,
    );
  }
  if (profile?.major) {
    profileLines.push(
      `The user studies/works in: ${profile.major}. Use relevant examples from this field when possible.`,
    );
  }
  if (profile?.interests && profile.interests.length > 0) {
    profileLines.push(
      `The user is interested in: ${profile.interests.join(", ")}. Reference these interests in scenarios when relevant.`,
    );
  }
  const profileBlock =
    profileLines.length > 0
      ? `\nUSER CONTEXT (personalize puzzles to this user):\n${profileLines.join("\n")}\n`
      : "";

  const prompt = `You are a puzzle master for Bloom, an app that builds critical thinking and media literacy skills.

Generate exactly ${count} multiple-choice puzzles about: "${topic.name}"
Context: ${topic.sampleContext}
${profileBlock}
Difficulty: ${difficulty}
- easy: 15-30 seconds. Clear and straightforward.
- medium: 30-60 seconds. Has a trick or nuance.
- hard: 60-90 seconds. Multi-step reasoning needed.
${difficultyInstruction}

Categories to use: ${topic.categories.join(", ")}

Each puzzle MUST have:
- question: Max 250 chars. Clear, no ambiguity.
- options: Exactly 4 choices. All plausible. Only 1 correct.
- correct_index: 0-3
- explanation: Max 200 chars. Educational.
- hint: Max 100 chars. A nudge, not a giveaway.
- category: One of ${topic.categories.join(", ")}
- difficulty: easy, medium, or hard
- tags: 2-3 keyword tags

RULES:
- Self-contained questions (no external context needed)
- Wrong options must be genuinely plausible
- Critical thinking puzzles should teach a real-world skill
- Never reference specific real people or current events
- Each puzzle tests a different concept

Respond ONLY with a valid JSON array. No markdown, no backticks, no preamble:
[{"question":"...","options":["A","B","C","D"],"correct_index":1,"explanation":"...","hint":"...","category":"...","difficulty":"...","tags":["...",""]}]`;

  try {
    const raw = await callGemini(prompt);
    const puzzles = parseGeminiResponse(raw);
    if (puzzles.length === 0) return useFallbacks(topicId, count);
    return insertPuzzles(topicId, puzzles);
  } catch {
    return useFallbacks(topicId, count);
  }
}

async function useFallbacks(
  topicId: string,
  count: number,
): Promise<DBPuzzle[]> {
  const fallbacks = FALLBACK_PUZZLES[topicId] ?? [];
  if (fallbacks.length === 0) return [];

  const selected = fallbacks.slice(0, count);
  return insertPuzzles(topicId, selected);
}

function stripAnswers(
  puzzle: DBPuzzle,
  attempted: boolean,
  attempt?: { user_answer: number; is_correct: boolean; points_earned: number },
): PuzzleForClient {
  const base: PuzzleForClient = {
    id: puzzle.id,
    topic: puzzle.topic,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    question: puzzle.question,
    options: puzzle.options,
    tags: puzzle.tags,
    attempted,
  };

  if (attempted && attempt) {
    base.correct_index = puzzle.correct_index;
    base.explanation = puzzle.explanation;
    base.hint = puzzle.hint;
    base.user_answer = attempt.user_answer;
    base.is_correct = attempt.is_correct;
    base.points_earned = attempt.points_earned;
  }

  return base;
}

export async function getDailyPuzzles(
  topicId: string,
  userId: string,
): Promise<{
  puzzles: PuzzleForClient[];
  started_at: string;
  limits: Record<string, number>;
}> {
  const today = todayUTC();
  const limits = await getDailyLimits(userId);

  const { data: existingSet } = await supabase
    .from("daily_puzzle_sets")
    .select("puzzle_ids")
    .eq("puzzle_date", today)
    .eq("topic", topicId)
    .single();

  let puzzleIds: string[];

  if (existingSet) {
    puzzleIds = existingSet.puzzle_ids as string[];
  } else {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .split("T")[0];

    const { data: recentSets } = await supabase
      .from("daily_puzzle_sets")
      .select("puzzle_ids")
      .gte("puzzle_date", thirtyDaysAgo);

    const usedIds = new Set(
      (recentSets ?? []).flatMap((s) => s.puzzle_ids as string[]),
    );

    const { data: cached } = await supabase
      .from("puzzles")
      .select("id")
      .eq("topic", topicId)
      .limit(20);

    const available = (cached ?? [])
      .filter((p) => !usedIds.has(p.id))
      .slice(0, 3);

    if (available.length >= 3) {
      puzzleIds = available.map((p) => p.id);
    } else {
      const profile = await fetchUserProfile(userId);
      const generated = await generatePuzzlesForTopic(
        topicId,
        3,
        "mixed",
        profile,
      );
      puzzleIds = generated.map((p) => p.id);
    }

    if (puzzleIds.length > 0) {
      await supabase.from("daily_puzzle_sets").insert({
        puzzle_date: today,
        topic: topicId,
        puzzle_ids: puzzleIds,
      });
    }
  }

  const { data: puzzles } = await supabase
    .from("puzzles")
    .select("*")
    .in("id", puzzleIds);

  const { data: attempts } = await supabase
    .from("puzzle_attempts")
    .select("puzzle_id, user_answer, is_correct, points_earned")
    .eq("user_id", userId)
    .in("puzzle_id", puzzleIds);

  const attemptMap = new Map(
    (attempts ?? []).map((a) => [a.puzzle_id, a]),
  );

  const clientPuzzles = (puzzles ?? []).map((p) => {
    const attempt = attemptMap.get(p.id);
    return stripAnswers(p as DBPuzzle, !!attempt, attempt);
  });

  return {
    puzzles: clientPuzzles,
    started_at: new Date().toISOString(),
    limits: {
      daily_puzzles_attempted: limits?.daily_puzzles_attempted ?? 0,
      daily_puzzles_remaining: Math.max(
        0,
        DAILY_CAP - (limits?.daily_puzzles_attempted ?? 0),
      ),
      custom_puzzles_generated: limits?.custom_puzzles_generated ?? 0,
      custom_puzzles_remaining: Math.max(
        0,
        CUSTOM_GEN_CAP - (limits?.custom_puzzles_generated ?? 0),
      ),
      hints_used: limits?.hints_used ?? 0,
      hints_remaining: Math.max(
        0,
        HINT_CAP - (limits?.hints_used ?? 0),
      ),
    },
  };
}

export async function generateCustomPuzzles(
  topicId: string,
  difficulty: string,
  userId: string,
): Promise<{ puzzles: PuzzleForClient[]; error?: string }> {
  const limits = await getDailyLimits(userId);
  if ((limits?.custom_puzzles_generated ?? 0) >= CUSTOM_GEN_CAP) {
    return {
      puzzles: [],
      error: "Daily custom generation cap reached (5/day)",
    };
  }

  const { data: attempts } = await supabase
    .from("puzzle_attempts")
    .select("puzzle_id")
    .eq("user_id", userId);

  const seenIds = (attempts ?? []).map((a) => a.puzzle_id);

  let query = supabase
    .from("puzzles")
    .select("*")
    .eq("topic", topicId)
    .limit(10);

  if (difficulty !== "mixed") {
    query = query.eq("difficulty", difficulty);
  }

  const { data: cached } = await query;
  const unseen = (cached ?? []).filter((p) => !seenIds.includes(p.id));

  let resultPuzzles: DBPuzzle[];
  if (unseen.length >= 3) {
    resultPuzzles = unseen.slice(0, 3) as DBPuzzle[];
  } else {
    const profile = await fetchUserProfile(userId);
    resultPuzzles = await generatePuzzlesForTopic(
      topicId,
      3,
      difficulty,
      profile,
    );
  }

  await incrementDailyLimit(userId, "custom_puzzles_generated");

  return {
    puzzles: resultPuzzles.map((p) => stripAnswers(p, false)),
  };
}

export async function submitAnswer(
  userId: string,
  puzzleId: string,
  userAnswer: number,
  startedAt: string,
  hintUsed: boolean,
): Promise<{
  is_correct: boolean;
  correct_index: number;
  explanation: string;
  points_earned: number;
  time_taken_seconds: number;
  error?: string;
  status?: number;
}> {
  if (userAnswer < 0 || userAnswer > 3) {
    return {
      is_correct: false,
      correct_index: -1,
      explanation: "",
      points_earned: 0,
      time_taken_seconds: 0,
      error: "Invalid answer index",
      status: 400,
    };
  }

  const { data: puzzle, error: puzzleError } = await supabase
    .from("puzzles")
    .select("*")
    .eq("id", puzzleId)
    .single();

  if (puzzleError || !puzzle) {
    return {
      is_correct: false,
      correct_index: -1,
      explanation: "",
      points_earned: 0,
      time_taken_seconds: 0,
      error: "Puzzle not found",
      status: 404,
    };
  }

  const { data: existing } = await supabase
    .from("puzzle_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("puzzle_id", puzzleId)
    .single();

  if (existing) {
    return {
      is_correct: false,
      correct_index: puzzle.correct_index,
      explanation: puzzle.explanation,
      points_earned: 0,
      time_taken_seconds: 0,
      error: "Already attempted this puzzle",
      status: 409,
    };
  }

  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const timeTakenSeconds = Math.floor((now - startTime) / 1000);

  if (timeTakenSeconds > ANSWER_WINDOW_SECONDS) {
    return {
      is_correct: false,
      correct_index: puzzle.correct_index,
      explanation: puzzle.explanation,
      points_earned: 0,
      time_taken_seconds: timeTakenSeconds,
      error: "Answer window expired (180s)",
      status: 400,
    };
  }

  const isCorrect = userAnswer === puzzle.correct_index;

  let pointsEarned = POINTS_WRONG;
  if (isCorrect) {
    pointsEarned = hintUsed ? POINTS_CORRECT_HINT : POINTS_CORRECT;
    if (timeTakenSeconds <= SPEED_THRESHOLD_SECONDS) {
      pointsEarned += POINTS_SPEED_BONUS;
    }
  }

  await supabase.from("puzzle_attempts").insert({
    user_id: userId,
    puzzle_id: puzzleId,
    user_answer: userAnswer,
    is_correct: isCorrect,
    time_taken_seconds: timeTakenSeconds,
    hint_used: hintUsed,
    points_earned: pointsEarned,
    started_at: startedAt,
  });

  const topicName = getTopicById(puzzle.topic)?.name ?? puzzle.topic;
  await awardPoints(
    userId,
    "teaser",
    pointsEarned,
    `Puzzle ${isCorrect ? "correct" : "wrong"}: ${topicName}`,
  );

  await incrementDailyLimit(userId, "daily_puzzles_attempted");

  return {
    is_correct: isCorrect,
    correct_index: puzzle.correct_index,
    explanation: puzzle.explanation,
    points_earned: pointsEarned,
    time_taken_seconds: timeTakenSeconds,
  };
}

export async function getHint(
  userId: string,
  puzzleId: string,
): Promise<{
  hint: string;
  hints_remaining: number;
  error?: string;
  status?: number;
}> {
  const limits = await getDailyLimits(userId);
  if ((limits?.hints_used ?? 0) >= HINT_CAP) {
    return {
      hint: "",
      hints_remaining: 0,
      error: "Daily hint cap reached (3/day)",
      status: 429,
    };
  }

  const { data: attempt } = await supabase
    .from("puzzle_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("puzzle_id", puzzleId)
    .single();

  if (attempt) {
    return {
      hint: "",
      hints_remaining: Math.max(
        0,
        HINT_CAP - (limits?.hints_used ?? 0),
      ),
      error: "Already attempted this puzzle",
      status: 409,
    };
  }

  const { data: puzzle } = await supabase
    .from("puzzles")
    .select("hint")
    .eq("id", puzzleId)
    .single();

  if (!puzzle) {
    return {
      hint: "",
      hints_remaining: 0,
      error: "Puzzle not found",
      status: 404,
    };
  }

  await incrementDailyLimit(userId, "hints_used");

  return {
    hint: puzzle.hint ?? "Think carefully about each option.",
    hints_remaining: Math.max(
      0,
      HINT_CAP - (limits?.hints_used ?? 0) - 1,
    ),
  };
}

interface AttemptWithPuzzle {
  id: string;
  puzzle_id: string;
  user_answer: number;
  is_correct: boolean;
  time_taken_seconds: number | null;
  hint_used: boolean;
  points_earned: number;
  answered_at: string;
  puzzles: {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
    topic: string;
    category: string;
    difficulty: string;
  };
}

interface CategoryStat {
  category: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export async function getUserPuzzleHistory(
  userId: string,
  limit: number,
): Promise<{
  history: AttemptWithPuzzle[];
  stats: {
    total_attempted: number;
    total_correct: number;
    accuracy: number;
    categories: CategoryStat[];
    best_category: string | null;
    worst_category: string | null;
  };
}> {
  const { data: attempts } = await supabase
    .from("puzzle_attempts")
    .select(
      "id, puzzle_id, user_answer, is_correct, time_taken_seconds, hint_used, points_earned, answered_at, puzzles(question, options, correct_index, explanation, topic, category, difficulty)",
    )
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(limit);

  const history = (attempts ?? []) as unknown as AttemptWithPuzzle[];

  const { data: allAttempts } = await supabase
    .from("puzzle_attempts")
    .select("is_correct, puzzles(category)")
    .eq("user_id", userId);

  const all = (allAttempts ?? []) as unknown as {
    is_correct: boolean;
    puzzles: { category: string };
  }[];

  const totalAttempted = all.length;
  const totalCorrect = all.filter((a) => a.is_correct).length;

  const catMap = new Map<string, { attempted: number; correct: number }>();
  for (const a of all) {
    const cat = a.puzzles?.category ?? "unknown";
    const entry = catMap.get(cat) ?? { attempted: 0, correct: 0 };
    entry.attempted++;
    if (a.is_correct) entry.correct++;
    catMap.set(cat, entry);
  }

  const categories: CategoryStat[] = Array.from(catMap.entries()).map(
    ([category, s]) => ({
      category,
      attempted: s.attempted,
      correct: s.correct,
      accuracy: s.attempted > 0 ? s.correct / s.attempted : 0,
    }),
  );

  const qualified = categories.filter((c) => c.attempted >= 3);
  const best =
    qualified.length > 0
      ? qualified.reduce((a, b) => (a.accuracy > b.accuracy ? a : b)).category
      : null;
  const worst =
    qualified.length > 0
      ? qualified.reduce((a, b) => (a.accuracy < b.accuracy ? a : b)).category
      : null;

  return {
    history,
    stats: {
      total_attempted: totalAttempted,
      total_correct: totalCorrect,
      accuracy: totalAttempted > 0 ? totalCorrect / totalAttempted : 0,
      categories,
      best_category: best,
      worst_category: worst,
    },
  };
}

export async function getTopicStats(userId: string) {
  const topicIds = getAllTopicIds();

  const { data: attempts } = await supabase
    .from("puzzle_attempts")
    .select("is_correct, puzzles(topic)")
    .eq("user_id", userId);

  const all = (attempts ?? []) as unknown as {
    is_correct: boolean;
    puzzles: { topic: string };
  }[];

  const statMap = new Map<string, { attempted: number; correct: number }>();
  for (const a of all) {
    const topic = a.puzzles?.topic ?? "unknown";
    const entry = statMap.get(topic) ?? { attempted: 0, correct: 0 };
    entry.attempted++;
    if (a.is_correct) entry.correct++;
    statMap.set(topic, entry);
  }

  const topicStats = topicIds.map((id) => {
    const s = statMap.get(id) ?? { attempted: 0, correct: 0 };
    return {
      topic_id: id,
      attempted: s.attempted,
      correct: s.correct,
      accuracy: s.attempted > 0 ? s.correct / s.attempted : 0,
    };
  });

  const qualified = topicStats.filter((t) => t.attempted >= 3);
  const recommended =
    qualified.length > 0
      ? qualified.reduce((a, b) => (a.accuracy < b.accuracy ? a : b)).topic_id
      : "media_literacy";

  return { topicStats, recommended };
}
