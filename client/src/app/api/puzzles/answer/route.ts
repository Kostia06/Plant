import { NextRequest, NextResponse } from "next/server";
import { validateAnswerSubmission } from "@/lib/puzzle-validators";
import { checkRateLimit } from "@/lib/rate-limiter";
import { supabase } from "@/lib/supabase";
import {
  submitAnswer,
  getOrCreatePuzzleDailyLimits,
  DAILY_PUZZLE_CAP,
  CUSTOM_ATTEMPT_CAP,
} from "@/lib/puzzle-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const check = validateAnswerSubmission(body);
    if (!check.valid || !check.data) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const { userId, puzzleId, answer, startedAt, hintUsed } = check.data;

    const rateCheck = checkRateLimit(userId, "puzzle-answer");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const limits = await getOrCreatePuzzleDailyLimits(userId);

    const today = new Date().toISOString().split("T")[0];
    const { data: dailySets } = await supabase
      .from("daily_puzzle_sets")
      .select("puzzle_ids")
      .eq("puzzle_date", today);

    const dailyPuzzleIds = new Set<string>();
    for (const set of dailySets || []) {
      for (const id of set.puzzle_ids as string[]) {
        dailyPuzzleIds.add(id);
      }
    }

    const isDaily = dailyPuzzleIds.has(puzzleId);

    if (isDaily && limits.daily_puzzles_attempted >= DAILY_PUZZLE_CAP) {
      return NextResponse.json(
        { error: "Daily puzzle attempt limit reached", max: DAILY_PUZZLE_CAP },
        { status: 429 },
      );
    }

    if (!isDaily && limits.custom_puzzles_attempted >= CUSTOM_ATTEMPT_CAP) {
      return NextResponse.json(
        { error: "Daily custom puzzle attempt limit reached", max: CUSTOM_ATTEMPT_CAP },
        { status: 429 },
      );
    }

    const result = await submitAnswer(userId, puzzleId, answer, startedAt, hintUsed);

    const updateField = isDaily ? "daily_puzzles_attempted" : "custom_puzzles_attempted";
    const currentVal = isDaily ? limits.daily_puzzles_attempted : limits.custom_puzzles_attempted;

    await supabase
      .from("puzzle_daily_limits")
      .update({ [updateField]: currentVal + 1 })
      .eq("id", limits.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DUPLICATE") {
        return NextResponse.json({ error: "Already attempted this puzzle" }, { status: 409 });
      }
      if (error.message === "Puzzle not found") {
        return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
      }
      if (error.message === "Answer time expired") {
        return NextResponse.json({ error: "Answer time expired. Please reload." }, { status: 400 });
      }
    }
    console.error("Puzzle answer POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
