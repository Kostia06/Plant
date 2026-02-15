import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data } = await supabase
      .from("user_scores")
      .select("user_id, current_score, tree_state, streak_days")
      .order("current_score", { ascending: false })
      .limit(20);

    return NextResponse.json({ leaderboard: data ?? [] });
  } catch (error) {
    console.error("Leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
