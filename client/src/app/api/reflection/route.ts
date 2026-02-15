import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { awardPoints } from "@/lib/points";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPTS = [
  "What did you learn today?",
  "What went well today?",
  "What challenged you today and how did you handle it?",
  "What are you grateful for right now?",
  "What's one thing you'd do differently today?",
  "What made you smile today?",
  "What's something new you discovered?",
  "How did you help someone today?",
  "What's one goal you made progress on?",
  "What did you spend the most time on today?",
  "What's a skill you want to develop further?",
  "How did you take care of your mental health today?",
  "What's something you're proud of this week?",
  "What relationship did you invest in today?",
  "What's one positive habit you practiced?",
  "How did you step outside your comfort zone?",
  "What's something you want to remember about today?",
  "What would your future self thank you for today?",
  "What's a mistake you learned from recently?",
  "How did you show kindness today?",
  "What's one thing that inspired you recently?",
  "What boundary did you set or maintain today?",
  "What creative idea came to you today?",
  "How did you manage your energy levels today?",
  "What's something you're looking forward to?",
  "What did you read or watch that made you think?",
  "How did you contribute to your community today?",
  "What's one assumption you questioned today?",
  "What would make tomorrow even better?",
  "What's something you forgave yourself for?",
  "How did you stay focused on what matters?",
  "What conversation stood out to you today?",
];

function pickPrompt(): string {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

async function generateFeedback(
  prompt: string,
  response: string,
): Promise<string | null> {
  try {
    const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(
      `You are a supportive life coach for the Yggdrasil app. The user completed a daily reflection.\n\nPrompt: "${prompt}"\nTheir response: "${response}"\n\nWrite 2-3 encouraging sentences of feedback. Be warm, supportive, and specific to what they wrote. Never be judgmental. Keep it concise.`,
    );
    return result.response.text().trim();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, response } = body;

    if (!user_id || !response?.trim()) {
      return NextResponse.json(
        { error: "user_id and response are required" },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("reflections")
      .select("id")
      .eq("user_id", user_id)
      .eq("reflection_date", today)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You already submitted a reflection today" },
        { status: 409 },
      );
    }

    const prompt = pickPrompt();
    const aiFeedback = await generateFeedback(prompt, response);

    const { data: reflection, error } = await supabase
      .from("reflections")
      .insert({
        user_id,
        prompt,
        response,
        ai_feedback: aiFeedback,
        reflection_date: today,
        points_earned: 20,
      })
      .select()
      .single();

    if (error) throw error;

    const scoreData = await awardPoints(
      user_id,
      "reflection",
      20,
      "Daily reflection completed",
    );

    await supabase.rpc("recalc_user_score", { uid: user_id });

    return NextResponse.json({
      reflection,
      score: scoreData,
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

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: reflections } = await supabase
      .from("reflections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    const todayDone = reflections?.some((r) => r.reflection_date === today);

    return NextResponse.json({
      reflections: reflections || [],
      today_completed: todayDone || false,
    });
  } catch (error) {
    console.error("Reflection GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
