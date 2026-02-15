import { NextRequest, NextResponse } from "next/server";
import { getScoreProfile, getStreakMultiplier } from "@/lib/points";
import { validateUserId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    const userCheck = validateUserId(userId ?? "");
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const rateCheck = checkRateLimit(userId!, "score");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const profile = await getScoreProfile(userId!);

    return NextResponse.json({
      current_score: profile.current_score,
      tree_state: profile.tree_state,
      streak_days: profile.streak_days,
      streak_multiplier: getStreakMultiplier(profile.streak_days),
      total_analyses: profile.total_analyses,
      total_reflections: profile.total_reflections,
      total_goals_completed: profile.total_goals_completed,
      total_teasers_correct: profile.total_teasers_correct,
      days_inactive: profile.days_inactive,
      today: profile.today,
    });
  } catch (error) {
    console.error("Score GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
