import { NextRequest, NextResponse } from "next/server";
import { getActivityHeatmap } from "@/lib/points";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    const daysParam = request.nextUrl.searchParams.get("days");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 },
      );
    }

    const days = Math.min(parseInt(daysParam || "90", 10), 365);
    const data = await getActivityHeatmap(userId, days);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("History GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
