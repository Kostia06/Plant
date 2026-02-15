import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getDailyTeasers } from "@/lib/teasers";

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
    const teasers = await getDailyTeasers();

    const { data: attempts } = await supabase
      .from("teaser_attempts")
      .select("teaser_index, user_answer, is_correct")
      .eq("user_id", userId)
      .eq("teaser_date", today);

    const attemptMap = new Map(
      (attempts || []).map((a) => [a.teaser_index, a]),
    );

    const response = teasers.map((teaser, index) => {
      const attempt = attemptMap.get(index);
      return {
        index,
        question: teaser.question,
        options: teaser.options,
        difficulty: teaser.difficulty,
        attempted: !!attempt,
        user_answer: attempt?.user_answer ?? null,
        is_correct: attempt?.is_correct ?? null,
        correct_index: attempt ? teaser.correct_index : undefined,
        explanation: attempt ? teaser.explanation : undefined,
      };
    });

    return NextResponse.json({ date: today, teasers: response });
  } catch (error) {
    console.error("Teasers GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
