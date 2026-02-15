import { NextRequest, NextResponse } from "next/server";
import { validateUserId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getUserPuzzleHistory } from "@/lib/puzzle-engine";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    const limitParam = request.nextUrl.searchParams.get("limit");

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

    const limit = Math.min(parseInt(limitParam || "20", 10), 50);
    const history = await getUserPuzzleHistory(userId!, limit);

    return NextResponse.json(history);
  } catch (error) {
    console.error("Puzzle history GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
