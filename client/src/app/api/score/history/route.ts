import { NextRequest, NextResponse } from "next/server";
import { getActivityHeatmap } from "@/lib/points";
import { validateUserId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    const daysParam = request.nextUrl.searchParams.get("days");

    const userCheck = validateUserId(userId ?? "");
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const rateCheck = checkRateLimit(userId!, "history");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const days = Math.min(parseInt(daysParam || "90", 10), 365);
    const data = await getActivityHeatmap(userId!, days);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("History GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
