import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateUserId, validateGoalTitle } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, title, description, is_public } = body;

    const userCheck = validateUserId(user_id);
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const titleCheck = validateGoalTitle(title);
    if (!titleCheck.valid) {
      return NextResponse.json({ error: titleCheck.error }, { status: 400 });
    }

    const rateCheck = checkRateLimit(user_id, "goals");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const { data: activeGoals } = await supabase
      .from("goals")
      .select("id")
      .eq("user_id", user_id)
      .eq("is_completed", false);

    if (activeGoals && activeGoals.length >= 10) {
      return NextResponse.json(
        {
          error: "Maximum 10 active goals. Complete or delete some first.",
        },
        { status: 400 },
      );
    }

    const { data: goal, error } = await supabase
      .from("goals")
      .insert({
        user_id,
        title: title.trim(),
        description: description?.trim() ?? null,
        is_public: is_public ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Goals POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    const userCheck = validateUserId(userId ?? "");
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const { data: active } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId!)
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    const { data: completed } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId!)
      .eq("is_completed", true)
      .order("completed_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      active: active ?? [],
      completed: completed ?? [],
    });
  } catch (error) {
    console.error("Goals GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
