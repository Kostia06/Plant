import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTodaysTeasers } from "@/lib/teasers";
import { awardPoints, POINTS } from "@/lib/points";
import { validateUserId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";

const MAX_ANSWER_TIME_MS = 120_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, teaser_index, answer, started_at } = body;

    const userCheck = validateUserId(user_id);
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    if (
      typeof teaser_index !== "number" ||
      teaser_index < 0 ||
      teaser_index > 2
    ) {
      return NextResponse.json(
        { error: "teaser_index must be 0, 1, or 2" },
        { status: 400 },
      );
    }

    if (typeof answer !== "number" || answer < 0 || answer > 3) {
      return NextResponse.json(
        { error: "answer must be 0, 1, 2, or 3" },
        { status: 400 },
      );
    }

    if (!started_at || typeof started_at !== "string") {
      return NextResponse.json(
        { error: "started_at timestamp is required" },
        { status: 400 },
      );
    }

    const startedTime = new Date(started_at).getTime();
    if (isNaN(startedTime)) {
      return NextResponse.json(
        { error: "Invalid started_at timestamp" },
        { status: 400 },
      );
    }

    const elapsed = Date.now() - startedTime;
    if (elapsed > MAX_ANSWER_TIME_MS) {
      return NextResponse.json(
        { error: "Teaser expired. Please reload." },
        { status: 400 },
      );
    }

    if (elapsed < 0) {
      return NextResponse.json(
        { error: "Invalid started_at timestamp" },
        { status: 400 },
      );
    }

    const rateCheck = checkRateLimit(user_id, "teaser-answer");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("teaser_attempts")
      .select("id")
      .eq("user_id", user_id)
      .eq("teaser_date", today)
      .eq("teaser_index", teaser_index)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Already attempted this teaser" },
        { status: 409 },
      );
    }

    const teasers = await getTodaysTeasers();
    const teaser = teasers[teaser_index];

    if (!teaser) {
      return NextResponse.json(
        { error: "Invalid teaser index" },
        { status: 400 },
      );
    }

    const isCorrect = answer === teaser.correct_index;
    const basePoints = isCorrect ? POINTS.TEASER_CORRECT : POINTS.TEASER_WRONG;

    const { error: insertError } = await supabase
      .from("teaser_attempts")
      .insert({
        user_id,
        teaser_date: today,
        teaser_index,
        user_answer: answer,
        is_correct: isCorrect,
        points_earned: basePoints,
        started_at,
        answered_at: new Date().toISOString(),
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Already attempted this teaser" },
          { status: 409 },
        );
      }
      throw insertError;
    }

    const scoreResult = await awardPoints(
      user_id,
      "teaser",
      basePoints,
      isCorrect
        ? "Brain teaser answered correctly"
        : "Brain teaser attempted",
    );

    return NextResponse.json({
      is_correct: isCorrect,
      correct_index: teaser.correct_index,
      explanation: teaser.explanation,
      points_earned: scoreResult.points_awarded,
      new_score: scoreResult.new_score,
      tree_state: scoreResult.tree_state,
    });
  } catch (error) {
    console.error("Teaser answer POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
