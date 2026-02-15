import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { awardPoints, checkWeeklyMilestone, POINTS } from "@/lib/points";
import { getTodaysPrompt } from "@/lib/reflection-prompts";
import { validateUserId, validateReflection, hashText } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface GeminiFeedback {
  feedback: string;
  effort: "genuine" | "low_effort";
}

async function getAiFeedback(
  prompt: string,
  response: string,
): Promise<GeminiFeedback | null> {
  try {
    const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(
      `A user in a mindfulness app wrote this daily reflection in response to the prompt "${prompt}":\n\n"${response}"\n\nDo two things:\n1. Write 2-3 sentences of warm, encouraging feedback. Be specific to what they wrote. Never be judgmental.\n2. Rate the effort as "genuine" or "low_effort". Mark as low_effort ONLY if the text is clearly gibberish, random characters, copy-pasted placeholder text, or completely unrelated to any form of reflection. Short but honest reflections are genuine.\n\nRespond as JSON: { "feedback": "...", "effort": "genuine" | "low_effort" }`,
    );

    let text = result.response.text().trim();
    if (text.startsWith("```")) {
      text = text.split("\n").slice(1).join("\n").replace(/```$/g, "").trim();
    }

    return JSON.parse(text) as GeminiFeedback;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, response } = body;

    const userCheck = validateUserId(user_id);
    if (!userCheck.valid) {
      return NextResponse.json({ error: userCheck.error }, { status: 400 });
    }

    const reflectionCheck = validateReflection(response);
    if (!reflectionCheck.valid) {
      return NextResponse.json(
        { error: reflectionCheck.error },
        { status: 400 },
      );
    }

    const rateCheck = checkRateLimit(user_id, "reflection");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retry_after: rateCheck.retryAfter },
        { status: 429 },
      );
    }

    const { data: limits } = await supabase.rpc("get_daily_limits", {
      uid: user_id,
    });

    if (limits && limits.reflections_count >= 1) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      return NextResponse.json(
        {
          error: "Daily reflection limit reached",
          next_available: tomorrow.toISOString(),
        },
        { status: 429 },
      );
    }

    const responseHash = hashText(response);

    const { data: duplicate } = await supabase
      .from("reflections")
      .select("id")
      .eq("user_id", user_id)
      .eq("response_hash", responseHash)
      .single();

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "You've submitted this reflection before. Try writing something new!",
        },
        { status: 409 },
      );
    }

    const prompt = getTodaysPrompt();
    const aiFeedback = await getAiFeedback(prompt, response);

    const isLowEffort = aiFeedback?.effort === "low_effort";
    const basePoints = isLowEffort
      ? POINTS.REFLECTION_LOW_EFFORT
      : POINTS.REFLECTION;

    const today = new Date().toISOString().split("T")[0];

    const { data: reflection, error: insertError } = await supabase
      .from("reflections")
      .insert({
        user_id,
        reflection_date: today,
        prompt,
        response: response.trim(),
        response_hash: responseHash,
        ai_feedback: aiFeedback?.feedback ?? null,
        is_low_effort: isLowEffort,
        points_earned: basePoints,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Daily reflection already submitted" },
          { status: 409 },
        );
      }
      throw insertError;
    }

    const scoreResult = await awardPoints(
      user_id,
      "reflection",
      basePoints,
      isLowEffort ? "Low-effort daily reflection" : "Daily reflection",
      reflection.id,
    );

    await checkWeeklyMilestone(user_id);

    return NextResponse.json({
      reflection_id: reflection.id,
      prompt,
      ai_feedback: aiFeedback?.feedback ?? null,
      points_earned: scoreResult.points_awarded,
      is_low_effort: isLowEffort,
      new_score: scoreResult.new_score,
      tree_state: scoreResult.tree_state,
      streak_days: scoreResult.streak_days,
    });
  } catch (error) {
    console.error("Reflection POST error:", error);
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

    const { data: reflections } = await supabase
      .from("reflections")
      .select(
        "id, prompt, response, ai_feedback, is_low_effort, points_earned, created_at",
      )
      .eq("user_id", userId!)
      .order("created_at", { ascending: false })
      .limit(30);

    const today = new Date().toISOString().split("T")[0];
    const todayCompleted = (reflections ?? []).some(
      (r) => r.created_at.split("T")[0] === today,
    );

    return NextResponse.json({
      reflections: reflections ?? [],
      today_completed: todayCompleted,
      todays_prompt: getTodaysPrompt(),
    });
  } catch (error) {
    console.error("Reflection GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
