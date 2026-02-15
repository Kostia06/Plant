import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { awardPoints, POINTS } from "@/lib/points";
import { validateUserId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";

const ONE_HOUR_MS = 3_600_000;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_id } = body;

    const userCheck = validateUserId(user_id);
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const rateCheck = checkRateLimit(user_id, "goals");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const { data: goal, error: fetchError } = await supabase
      .from("goals")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (goal.user_id !== user_id) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (goal.is_completed) {
      return NextResponse.json(
        { error: "Goal already completed" },
        { status: 409 },
      );
    }

    const ageMs = Date.now() - new Date(goal.created_at).getTime();
    if (ageMs < ONE_HOUR_MS) {
      return NextResponse.json(
        {
          error: "Goals must exist for at least 1 hour before completion.",
        },
        { status: 400 },
      );
    }

    const { data: limits } = await supabase.rpc("get_daily_limits", {
      uid: user_id,
    });

    if (limits && limits.goals_completed_count >= 3) {
      return NextResponse.json(
        { error: "Daily goal completion limit reached (3/day)" },
        { status: 429 },
      );
    }

    const { error: updateError } = await supabase
      .from("goals")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        points_earned: POINTS.GOAL_COMPLETED,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    const scoreResult = await awardPoints(
      user_id,
      "goal",
      POINTS.GOAL_COMPLETED,
      `Completed goal: ${goal.title}`,
      id,
    );

    return NextResponse.json({
      goal_id: id,
      completed: true,
      points_earned: scoreResult.points_awarded,
      new_score: scoreResult.new_score,
      tree_state: scoreResult.tree_state,
      streak_days: scoreResult.streak_days,
    });
  } catch (error) {
    console.error("Goal PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.nextUrl.searchParams.get("user_id");

    const userCheck = validateUserId(userId ?? "");
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const { data: goal } = await supabase
      .from("goals")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!goal || goal.user_id !== userId) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    await supabase.from("goals").delete().eq("id", id);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Goal DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
