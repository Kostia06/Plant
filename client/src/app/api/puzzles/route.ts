import { NextRequest, NextResponse } from "next/server";
import { validateUserId } from "@/lib/validators";
import { validateTopicId, validateDifficulty, validatePuzzleGeneration } from "@/lib/puzzle-validators";
import { checkRateLimit } from "@/lib/rate-limiter";
import { supabase } from "@/lib/supabase";
import { getTopicById } from "@/lib/puzzle-topics";
import {
  generateDailySet,
  generateCustomPuzzles,
  getOrCreatePuzzleDailyLimits,
  DAILY_PUZZLE_CAP,
  CUSTOM_GEN_CAP,
  HINTS_CAP,
} from "@/lib/puzzle-engine";
import { applyDecayOnLogin } from "@/lib/points";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    const topicParam = request.nextUrl.searchParams.get("topic") ?? "media_literacy";

    const userCheck = validateUserId(userId ?? "");
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const topicCheck = validateTopicId(topicParam);
    if (!topicCheck.valid) {
      return NextResponse.json({ error: topicCheck.error }, { status: 400 });
    }

    const rateCheck = checkRateLimit(userId!, "puzzles");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    await applyDecayOnLogin(userId!);

    const dailySet = await generateDailySet(topicParam);

    const today = new Date().toISOString().split("T")[0];
    const { data: attempts } = await supabase
      .from("puzzle_attempts")
      .select("puzzle_id, user_answer, is_correct, points_earned")
      .eq("user_id", userId!)
      .in("puzzle_id", dailySet.puzzles.map((p) => p.id));

    const attemptMap = new Map(
      (attempts ?? []).map((a) => [a.puzzle_id, a]),
    );

    const startedAt = new Date().toISOString();

    const puzzles = dailySet.puzzles.map((puzzle) => {
      const attempt = attemptMap.get(puzzle.id);

      if (attempt) {
        return {
          ...puzzle,
          attempted: true,
          user_answer: attempt.user_answer,
          is_correct: attempt.is_correct,
          points_earned: attempt.points_earned,
        };
      }

      const { hint: _hint, ...rest } = puzzle;
      return { ...rest, attempted: false, hint_available: !!puzzle.hint };
    });

    const limits = await getOrCreatePuzzleDailyLimits(userId!);
    const topic = getTopicById(topicParam);

    return NextResponse.json({
      date: today,
      topic: topic ? { id: topic.id, name: topic.name, icon: topic.icon } : null,
      puzzles,
      started_at: startedAt,
      daily_limits: {
        daily_puzzles_attempted: limits.daily_puzzles_attempted,
        daily_puzzles_max: DAILY_PUZZLE_CAP,
        custom_puzzles_generated: limits.custom_puzzles_generated,
        custom_puzzles_max: CUSTOM_GEN_CAP,
        hints_remaining: HINTS_CAP - limits.hints_used,
      },
    });
  } catch (error) {
    console.error("Puzzles GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const check = validatePuzzleGeneration(body);
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const { user_id, topic, difficulty } = body;

    const rateCheck = checkRateLimit(user_id, "puzzles");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const limits = await getOrCreatePuzzleDailyLimits(user_id);

    if (limits.custom_puzzles_generated >= CUSTOM_GEN_CAP) {
      return NextResponse.json(
        { error: "Daily custom puzzle generation limit reached", max: CUSTOM_GEN_CAP },
        { status: 429 },
      );
    }

    const puzzles = await generateCustomPuzzles(user_id, topic, difficulty, 3);

    await supabase
      .from("puzzle_daily_limits")
      .update({ custom_puzzles_generated: limits.custom_puzzles_generated + 1 })
      .eq("id", limits.id);

    const startedAt = new Date().toISOString();

    return NextResponse.json({
      puzzles: puzzles.map(({ hint: _h, ...rest }) => ({
        ...rest,
        hint_available: true,
      })),
      started_at: startedAt,
      topic,
      difficulty,
    }, { status: 201 });
  } catch (error) {
    console.error("Puzzles POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
