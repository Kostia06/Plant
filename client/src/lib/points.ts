import { supabase } from "./supabase";

export async function awardPoints(
  userId: string,
  action: string,
  points: number,
  description: string,
) {
  const today = new Date().toISOString().split("T")[0];

  await supabase.from("points_ledger").insert({
    user_id: userId,
    action,
    points,
    description,
    ledger_date: today,
  });

  await supabase.rpc("recalc_user_score", { uid: userId });
  await checkStreak(userId);

  const { data } = await supabase
    .from("user_scores")
    .select("current_score, tree_state")
    .eq("user_id", userId)
    .single();

  return data;
}

export function getTreeState(score: number): string {
  if (score < 0) return "withered";
  if (score < 100) return "seedling";
  if (score < 500) return "sapling";
  if (score < 1000) return "healthy";
  return "blooming";
}

export async function checkStreak(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];

  const { data: score } = await supabase
    .from("user_scores")
    .select("streak_days, last_active_date")
    .eq("user_id", userId)
    .single();

  if (!score) {
    await supabase.from("user_scores").upsert({
      user_id: userId,
      streak_days: 1,
      last_active_date: today,
    });
    return;
  }

  if (score.last_active_date === today) return;

  const newStreak =
    score.last_active_date === yesterday ? score.streak_days + 1 : 1;

  await supabase
    .from("user_scores")
    .update({ streak_days: newStreak, last_active_date: today })
    .eq("user_id", userId);
}

function getLevel(points: number): number {
  if (points <= 0) return 0;
  if (points <= 20) return 1;
  if (points <= 40) return 2;
  if (points <= 70) return 3;
  return 4;
}

export async function getActivityHeatmap(userId: string, days: number) {
  const startDate = new Date(Date.now() - days * 86400000)
    .toISOString()
    .split("T")[0];

  const { data } = await supabase
    .from("points_ledger")
    .select("points, ledger_date")
    .eq("user_id", userId)
    .gte("ledger_date", startDate)
    .order("ledger_date", { ascending: true });

  const dateMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 86400000)
      .toISOString()
      .split("T")[0];
    dateMap.set(date, 0);
  }

  data?.forEach((row) => {
    const existing = dateMap.get(row.ledger_date) || 0;
    dateMap.set(row.ledger_date, existing + row.points);
  });

  return Array.from(dateMap.entries())
    .map(([date, points]) => ({
      date,
      points,
      level: getLevel(points),
    }))
    .reverse();
}
