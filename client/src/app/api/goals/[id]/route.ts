import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { awardPoints } from "@/lib/points";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 },
      );
    }

    const { data: goal, error } = await supabase
      .from("goals")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        points_earned: 30,
      })
      .eq("id", id)
      .eq("user_id", user_id)
      .select()
      .single();

    if (error || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const scoreData = await awardPoints(
      user_id,
      "goal",
      30,
      `Completed goal: ${goal.title}`,
    );

    await supabase
      .from("user_scores")
      .update({
        total_goals_completed: supabase.rpc ? undefined : 0,
      })
      .eq("user_id", user_id);

    return NextResponse.json({ goal, score: scoreData });
  } catch (error) {
    console.error("Goals PATCH error:", error);
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

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Goals DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
