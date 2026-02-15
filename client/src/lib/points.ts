import { supabase } from "./supabase";

export interface PointsResult {
  points_awarded: number;
  new_score: number;
  tree_state: string;
  streak_days: number;
  message: string;
  first_action_bonus: boolean;
  streak_multiplier: number;
}

export interface ScoreProfile {
  current_score: number;
  tree_state: string;
  streak_days: number;
  streak_multiplier: number;
  total_analyses: number;
  total_reflections: number;
  total_goals_completed: number;
  total_teasers_correct: number;
  days_inactive: number;
  today: {
    reflection_done: boolean;
    teasers_completed: number;
    teasers_correct: number;
    goals_completed: number;
    analyses_done: number;
    points_earned: number;
    first_action_bonus: boolean;
  };
}

export interface HeatmapDay {
  date: string;
  points: number;
  level: number;
}

export const POINTS = {
  REFLECTION: 15,
  REFLECTION_LOW_EFFORT: 3,
  TEASER_CORRECT: 8,
  TEASER_WRONG: 2,
  GOAL_COMPLETED: 20,
  VIDEO_ANALYSIS: 10,
  MISINFORMATION_BONUS: 5,
  FIRST_ACTION: 5,
} as const;

export const DAILY_CAPS = {
  REFLECTIONS: 1,
  GOALS_COMPLETED: 3,
  ANALYSES: 5,
  MISINFORMATION_BONUSES: 3,
  TEASERS: 3,
} as const;

const ACTION_TO_CAP_FIELD: Record<string, keyof typeof DAILY_CAPS> = {
  reflection: "REFLECTIONS",
  goal: "GOALS_COMPLETED",
  analysis: "ANALYSES",
  misinformation_bonus: "MISINFORMATION_BONUSES",
  teaser: "TEASERS",
};

const ACTION_TO_DB_FIELD: Record<string, string> = {
  reflection: "reflections_count",
  goal: "goals_completed_count",
  analysis: "analyses_count",
  misinformation_bonus: "misinformation_bonuses_count",
};

export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 14) return 1.75;
  if (streakDays >= 7) return 1.5;
  if (streakDays >= 3) return 1.2;
  return 1.0;
}

export function getTreeState(score: number, daysInactive: number): string {
  if (daysInactive >= 2) return "withered";
  if (score < 150) return "seedling";
  if (score < 500) return "sapling";
  if (score < 1000) return "healthy";
  return "blooming";
}

function getLevel(points: number): number {
  if (points <= 0) return 0;
  if (points <= 20) return 1;
  if (points <= 40) return 2;
  if (points <= 70) return 3;
  return 4;
}

async function getOrCreateDailyLimits(userId: string) {
  const { data } = await supabase.rpc("get_daily_limits", { uid: userId });
  return data;
}

export async function checkDailyCap(
  userId: string,
  action: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const capKey = ACTION_TO_CAP_FIELD[action];
  if (!capKey) return { allowed: true, remaining: 999 };

  const cap = DAILY_CAPS[capKey];
  const limits = await getOrCreateDailyLimits(userId);
  if (!limits) return { allowed: true, remaining: cap };

  const dbField = ACTION_TO_DB_FIELD[action];
  const current = dbField ? (limits[dbField] ?? 0) : 0;

  return {
    allowed: current < cap,
    remaining: Math.max(0, cap - current),
  };
}

export async function awardPoints(
  userId: string,
  action: string,
  basePoints: number,
  description: string,
  referenceId?: string,
): Promise<PointsResult> {
  const capCheck = await checkDailyCap(userId, action);
  if (!capCheck.allowed) {
    const { data: score } = await supabase
      .from("user_scores")
      .select("current_score, tree_state, streak_days")
      .eq("user_id", userId)
      .single();

    return {
      points_awarded: 0,
      new_score: score?.current_score ?? 0,
      tree_state: score?.tree_state ?? "seedling",
      streak_days: score?.streak_days ?? 0,
      message: `Daily ${action} limit reached`,
      first_action_bonus: false,
      streak_multiplier: 1.0,
    };
  }

  const limits = await getOrCreateDailyLimits(userId);
  const isFirstAction = limits && !limits.first_action_awarded;

  const { data: streakResult } = await supabase.rpc("calc_streak", {
    uid: userId,
  });
  const streakDays = streakResult ?? 0;
  const multiplier = getStreakMultiplier(streakDays);

  const adjustedPoints = Math.floor(basePoints * multiplier);

  await supabase.from("points_ledger").insert({
    user_id: userId,
    action,
    points: adjustedPoints,
    description,
    reference_id: referenceId ?? null,
  });

  const dbField = ACTION_TO_DB_FIELD[action];
  if (dbField && limits) {
    await supabase
      .from("daily_limits")
      .update({ [dbField]: (limits[dbField] ?? 0) + 1 })
      .eq("user_id", userId)
      .eq("limit_date", limits.limit_date);
  }

  let firstActionBonus = false;
  if (isFirstAction) {
    await supabase.from("points_ledger").insert({
      user_id: userId,
      action: "first_action",
      points: POINTS.FIRST_ACTION,
      description: "First action of the day bonus",
    });

    await supabase
      .from("daily_limits")
      .update({ first_action_awarded: true })
      .eq("user_id", userId)
      .eq("limit_date", limits.limit_date);

    firstActionBonus = true;
  }

  const { data: totalScore } = await supabase.rpc("recalc_user_score", {
    uid: userId,
  });

  const totalAwarded =
    adjustedPoints + (firstActionBonus ? POINTS.FIRST_ACTION : 0);

  const newScore = totalScore ?? 0;

  return {
    points_awarded: totalAwarded,
    new_score: newScore,
    tree_state: getTreeState(newScore, 0),
    streak_days: streakDays,
    message: `You earned ${totalAwarded} points!`,
    first_action_bonus: firstActionBonus,
    streak_multiplier: multiplier,
  };
}

export async function applyDecayOnLogin(
  userId: string,
): Promise<{ decayed: number; new_score: number }> {
  const { data: decayed } = await supabase.rpc("apply_decay", {
    uid: userId,
  });

  const { data: newScore } = await supabase.rpc("recalc_user_score", {
    uid: userId,
  });

  return {
    decayed: decayed ?? 0,
    new_score: newScore ?? 0,
  };
}

export async function getScoreProfile(
  userId: string,
): Promise<ScoreProfile> {
  await applyDecayOnLogin(userId);

  const { data: streak } = await supabase.rpc("calc_streak", {
    uid: userId,
  });
  const streakDays = streak ?? 0;

  const { data: score } = await supabase
    .from("user_scores")
    .select("*")
    .eq("user_id", userId)
    .single();

  const limits = await getOrCreateDailyLimits(userId);

  const today = new Date().toISOString().split("T")[0];
  const { data: todayPoints } = await supabase
    .from("points_ledger")
    .select("points, action")
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00Z`)
    .lt("created_at", `${today}T23:59:59.999Z`);

  const pointsToday = (todayPoints ?? []).reduce(
    (sum, r) => sum + r.points,
    0,
  );

  const teasersCompleted =
    (todayPoints ?? []).filter((p) => p.action === "teaser").length;
  const teasersCorrect =
    (todayPoints ?? []).filter(
      (p) => p.action === "teaser" && p.points >= POINTS.TEASER_CORRECT,
    ).length;

  const lastActive = score?.last_active_date;
  const daysInactive = lastActive
    ? Math.floor(
        (Date.now() - new Date(lastActive).getTime()) / 86_400_000,
      )
    : 0;

  return {
    current_score: score?.current_score ?? 0,
    tree_state: getTreeState(score?.current_score ?? 0, daysInactive),
    streak_days: streakDays,
    streak_multiplier: getStreakMultiplier(streakDays),
    total_analyses: score?.total_analyses ?? 0,
    total_reflections: score?.total_reflections ?? 0,
    total_goals_completed: score?.total_goals_completed ?? 0,
    total_teasers_correct: score?.total_teasers_correct ?? 0,
    days_inactive: daysInactive,
    today: {
      reflection_done: (limits?.reflections_count ?? 0) > 0,
      teasers_completed: teasersCompleted,
      teasers_correct: teasersCorrect,
      goals_completed: limits?.goals_completed_count ?? 0,
      analyses_done: limits?.analyses_count ?? 0,
      points_earned: pointsToday,
      first_action_bonus: limits?.first_action_awarded ?? false,
    },
  };
}

export async function getActivityHeatmap(
  userId: string,
  days: number,
): Promise<HeatmapDay[]> {
  const startDate = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .split("T")[0];

  const { data } = await supabase
    .from("points_ledger")
    .select("points, created_at")
    .eq("user_id", userId)
    .gte("created_at", `${startDate}T00:00:00Z`)
    .order("created_at", { ascending: true });

  const dateMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 86_400_000)
      .toISOString()
      .split("T")[0];
    dateMap.set(date, 0);
  }

  data?.forEach((row) => {
    const date = row.created_at.split("T")[0];
    const existing = dateMap.get(date) ?? 0;
    dateMap.set(date, existing + row.points);
  });

  return Array.from(dateMap.entries())
    .map(([date, points]) => ({
      date,
      points,
      level: getLevel(points),
    }))
    .reverse();
}

export async function checkWeeklyMilestone(
  userId: string,
): Promise<boolean> {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - mondayOffset);
  const mondayStr = monday.toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("points_ledger")
    .select("id")
    .eq("user_id", userId)
    .eq("action", "weekly_milestone")
    .gte("created_at", `${mondayStr}T00:00:00Z`)
    .limit(1);

  if (existing && existing.length > 0) return false;

  const reflectionDates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    const { data } = await supabase
      .from("reflections")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", `${dateStr}T00:00:00Z`)
      .lt("created_at", `${dateStr}T23:59:59.999Z`)
      .limit(1);

    if (data && data.length > 0) {
      reflectionDates.add(dateStr);
    }
  }

  if (reflectionDates.size < 7) return false;

  await supabase.from("points_ledger").insert({
    user_id: userId,
    action: "weekly_milestone",
    points: 50,
    description: "Weekly milestone: 7 day reflection streak",
  });

  await supabase.rpc("recalc_user_score", { uid: userId });
  return true;
}
