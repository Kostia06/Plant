import { NextRequest, NextResponse } from "next/server";
import { validateUserId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getHint } from "@/lib/puzzle-engine";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, puzzle_id } = body;

    const userCheck = validateUserId(user_id ?? "");
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    if (!puzzle_id || typeof puzzle_id !== "string" || !UUID_REGEX.test(puzzle_id)) {
      return NextResponse.json({ error: "puzzle_id must be a valid UUID" }, { status: 400 });
    }

    const rateCheck = checkRateLimit(user_id, "puzzles");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const result = await getHint(user_id, puzzle_id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "HINT_LIMIT") {
        return NextResponse.json(
          { error: "Daily hint limit reached (3/day)" },
          { status: 429 },
        );
      }
      if (error.message === "ALREADY_ATTEMPTED") {
        return NextResponse.json(
          { error: "Cannot get hint for an already-attempted puzzle" },
          { status: 409 },
        );
      }
      if (error.message === "Puzzle not found") {
        return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
      }
    }
    console.error("Puzzle hint POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
