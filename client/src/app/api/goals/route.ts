import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, title, description, is_public } = body;

    if (!user_id || !title?.trim()) {
      return NextResponse.json(
        { error: "user_id and title are required" },
        { status: 400 },
      );
    }

    const { data: goal, error } = await supabase
      .from("goals")
      .insert({
        user_id,
        title,
        description: description || null,
        is_public: is_public || false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ goal });
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

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 },
      );
    }

    const { data: goals } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const active = (goals || []).filter((g) => !g.is_completed);
    const completed = (goals || []).filter((g) => g.is_completed);

    return NextResponse.json({ active, completed });
  } catch (error) {
    console.error("Goals GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
