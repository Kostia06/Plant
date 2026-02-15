import { NextRequest, NextResponse } from "next/server";
import { validateUserId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";
import { supabase } from "@/lib/supabase";
import { PUZZLE_TOPICS } from "@/lib/puzzle-topics";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    const userCheck = validateUserId(userId ?? "");
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const rateCheck = checkRateLimit(userId!, "puzzles");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const { data: stats } = await supabase
      .from("puzzle_stats")
      .select("*")
      .eq("user_id", userId!)
      .single();

    let lowestAccuracy = Infinity;
    let recommended = "media_literacy";

    const topics = PUZZLE_TOPICS.map((topic) => {
      const userStats = { attempted: 0, correct: 0, accuracy: 0 };

      if (stats) {
        for (const cat of topic.categories) {
          const att = (stats[`${cat}_attempted`] as number) ?? 0;
          const cor = (stats[`${cat}_correct`] as number) ?? 0;
          userStats.attempted += att;
          userStats.correct += cor;
        }
        userStats.accuracy = userStats.attempted > 0
          ? Math.round((userStats.correct / userStats.attempted) * 1000) / 10
          : 0;

        if (userStats.attempted >= 3 && userStats.accuracy < lowestAccuracy) {
          lowestAccuracy = userStats.accuracy;
          recommended = topic.id;
        }
      }

      return {
        id: topic.id,
        name: topic.name,
        icon: topic.icon,
        description: topic.description,
        user_stats: userStats,
      };
    });

    return NextResponse.json({
      topics,
      recommended_topic: recommended,
    });
  } catch (error) {
    console.error("Puzzle topics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
