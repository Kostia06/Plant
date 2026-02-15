import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTodaysTeasers } from "@/lib/teasers";
import { validateUserId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    const userCheck = validateUserId(userId ?? "");
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const rateCheck = checkRateLimit(userId!, "teasers");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const teasers = await getTodaysTeasers();

    const { data: attempts } = await supabase
      .from("teaser_attempts")
      .select("teaser_index, user_answer, is_correct, points_earned")
      .eq("user_id", userId!)
      .eq("teaser_date", today);

    const attemptMap = new Map(
      (attempts ?? []).map((a) => [a.teaser_index, a]),
    );

    const startedAt = new Date().toISOString();

    const response = teasers.map((teaser, index) => {
      const attempt = attemptMap.get(index);

      if (attempt) {
        return {
          index,
          question: teaser.question,
          options: teaser.options,
          difficulty: teaser.difficulty,
          category: teaser.category,
          attempted: true,
          user_answer: Number(attempt.user_answer),
          is_correct: attempt.is_correct,
          correct_index: teaser.correct_index,
          explanation: teaser.explanation,
          points_earned: attempt.points_earned,
        };
      }

      return {
        index,
        question: teaser.question,
        options: teaser.options,
        difficulty: teaser.difficulty,
        category: teaser.category,
        attempted: false,
      };
    });

    return NextResponse.json({
      date: today,
      teasers: response,
      started_at: startedAt,
    });
  } catch (error) {
    console.error("Teasers GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
