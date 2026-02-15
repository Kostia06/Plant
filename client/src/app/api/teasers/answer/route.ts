import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getDailyTeasers } from "@/lib/teasers";
import { awardPoints } from "@/lib/points";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, teaser_index, answer } = body;

    if (!user_id || teaser_index == null || answer == null) {
      return NextResponse.json(
        { error: "user_id, teaser_index, and answer are required" },
        { status: 400 },
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

    const teasers = await getDailyTeasers();
    const teaser = teasers[teaser_index];

    if (!teaser) {
      return NextResponse.json(
        { error: "Invalid teaser index" },
        { status: 400 },
      );
    }

    const isCorrect = answer === teaser.correct_index;
    const pointsEarned = isCorrect ? 10 : 0;

    await supabase.from("teaser_attempts").insert({
      user_id,
      teaser_date: today,
      teaser_index: teaser_index,
      user_answer: String(answer),
      is_correct: isCorrect,
      points_earned: pointsEarned,
    });

    let scoreData = null;
    if (isCorrect) {
      scoreData = await awardPoints(
        user_id,
        "teaser",
        10,
        "Brain teaser answered correctly",
      );
    }

    return NextResponse.json({
      is_correct: isCorrect,
      correct_index: teaser.correct_index,
      explanation: teaser.explanation,
      points_earned: pointsEarned,
      score: scoreData,
    });
  } catch (error) {
    console.error("Teaser answer POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
