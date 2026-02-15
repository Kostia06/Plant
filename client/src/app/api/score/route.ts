import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: score } = await supabase
      .from("user_scores")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { data: todayReflection } = await supabase
      .from("reflections")
      .select("id")
      .eq("user_id", userId)
      .eq("reflection_date", today)
      .single();

    const { data: todayTeasers } = await supabase
      .from("teaser_attempts")
      .select("id")
      .eq("user_id", userId)
      .eq("teaser_date", today);

    const { data: todayGoals } = await supabase
      .from("goals")
      .select("id")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .gte("completed_at", `${today}T00:00:00Z`)
      .lt("completed_at", `${today}T23:59:59Z`);

    const { data: todayPoints } = await supabase
      .from("points_ledger")
      .select("points")
      .eq("user_id", userId)
      .eq("ledger_date", today);

    const pointsToday = (todayPoints || []).reduce(
      (sum, r) => sum + r.points,
      0,
    );

    return NextResponse.json({
      current_score: score?.current_score || 0,
      tree_state: score?.tree_state || "seedling",
      streak_days: score?.streak_days || 0,
      total_analyses: score?.total_analyses || 0,
      total_reflections: score?.total_reflections || 0,
      total_goals_completed: score?.total_goals_completed || 0,
      total_teasers_correct: score?.total_teasers_correct || 0,
      today: {
        reflection_done: !!todayReflection,
        teasers_completed: todayTeasers?.length || 0,
        goals_completed_today: todayGoals?.length || 0,
        points_earned_today: pointsToday,
      },
    });
  } catch (error) {
    console.error("Score GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
