"use client";

// ── Plant Age Currency Model ────────────────────────────────────
// All values stored as "Plant Minutes" in localStorage.
// Display conversion: 60 min = 1 Plant Day, 24 Plant Days = 1 Plant Year
// 1 Plant Year = 1440 Plant Minutes

const STORAGE_KEY = "plant_minutes_state";
const DAILY_CAP = 170;

export interface PlantMinutesState {
    balance: number;
    earnedToday: number;
    totalLifetimeEarned: number;
    lastResetDate: string; // YYYY-MM-DD
}

export interface PlantAgeDisplay {
    years: number;
    days: number;
    minutes: number;
    totalMinutes: number;
}

export type PlantStage =
    | "seed"
    | "sprout"
    | "sapling"
    | "young_tree"
    | "mature"
    | "ancient";

export const PLANT_STAGE_THRESHOLDS: { stage: PlantStage; min: number }[] = [
    { stage: "ancient", min: 6000 },
    { stage: "mature", min: 3000 },
    { stage: "young_tree", min: 1500 },
    { stage: "sapling", min: 600 },
    { stage: "sprout", min: 200 },
    { stage: "seed", min: 0 },
];

export const PLANT_STAGE_LABELS: Record<PlantStage, string> = {
    seed: "Seed 🌰",
    sprout: "Sprout 🌱",
    sapling: "Sapling 🌿",
    young_tree: "Young Tree 🌳",
    mature: "Mature Tree 🌲",
    ancient: "Ancient Tree 🏔️",
};

export const PLANT_STAGE_EMOJI: Record<PlantStage, string> = {
    seed: "🌰",
    sprout: "🌱",
    sapling: "🌿",
    young_tree: "🌳",
    mature: "🌲",
    ancient: "🏔️",
};

// ── Spend cost curve (discourages long sessions) ─────────────
const SPEND_COSTS: { allowanceMinutes: number; cost: number }[] = [
    { allowanceMinutes: 5, cost: 8 },
    { allowanceMinutes: 10, cost: 15 },
    { allowanceMinutes: 20, cost: 28 },
];

// ── Activity rewards ─────────────────────────────────────────
export const ACTIVITY_REWARDS = [
    { id: "reflection", name: "Reflection", reward: 15, dailyCap: 1, icon: "📝" },
    { id: "brain_teaser", name: "Brain Teaser (correct)", reward: 8, dailyCap: 3, icon: "🧩" },
    { id: "video_analysis", name: "Video Fact-Check", reward: 10, dailyCap: 5, icon: "📹" },
    { id: "goal_completed", name: "Goal Completed", reward: 20, dailyCap: 3, icon: "🎯" },

] as const;

// ── Helpers ──────────────────────────────────────────────────

function getTodayStr(): string {
    return new Date().toISOString().split("T")[0];
}

function defaultState(): PlantMinutesState {
    return {
        balance: 0,
        earnedToday: 0,
        totalLifetimeEarned: 0,
        lastResetDate: getTodayStr(),
    };
}

// ── Core API ────────────────────────────────────────────────

export function loadState(): PlantMinutesState {
    if (typeof window === "undefined") return defaultState();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const state = JSON.parse(raw) as PlantMinutesState;
        return resetDailyIfNeeded(state);
    } catch {
        return defaultState();
    }
}

export function saveState(state: PlantMinutesState): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetDailyIfNeeded(state: PlantMinutesState): PlantMinutesState {
    const today = getTodayStr();
    if (state.lastResetDate !== today) {
        return { ...state, earnedToday: 0, lastResetDate: today };
    }
    return state;
}

export function earn(amount: number): { success: boolean; state: PlantMinutesState; earned: number } {
    const state = loadState();
    const remaining = DAILY_CAP - state.earnedToday;
    if (remaining <= 0) {
        return { success: false, state, earned: 0 };
    }
    const actual = Math.min(amount, remaining);
    const updated: PlantMinutesState = {
        balance: state.balance + actual,
        earnedToday: state.earnedToday + actual,
        totalLifetimeEarned: state.totalLifetimeEarned + actual,
        lastResetDate: state.lastResetDate,
    };
    saveState(updated);
    return { success: true, state: updated, earned: actual };
}

export function spend(amount: number): { success: boolean; state: PlantMinutesState } {
    const state = loadState();
    if (state.balance < amount) {
        return { success: false, state };
    }
    const updated: PlantMinutesState = {
        ...state,
        balance: state.balance - amount,
    };
    saveState(updated);
    return { success: true, state: updated };
}

// ── Display Conversion ──────────────────────────────────────

export function getDisplayAge(totalMinutes: number): PlantAgeDisplay {
    const years = Math.floor(totalMinutes / 1440);
    const days = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    return { years, days, minutes, totalMinutes };
}

export function formatPlantAge(display: PlantAgeDisplay): string {
    const parts: string[] = [];
    if (display.years > 0) parts.push(`${display.years}y`);
    if (display.days > 0) parts.push(`${display.days}d`);
    parts.push(`${display.minutes}m`);
    return parts.join(" ");
}

// ── Plant Stage ─────────────────────────────────────────────

export function getPlantStage(totalLifetimeEarned: number): PlantStage {
    for (const { stage, min } of PLANT_STAGE_THRESHOLDS) {
        if (totalLifetimeEarned >= min) return stage;
    }
    return "seed";
}

export function getNextStageProgress(totalLifetimeEarned: number): {
    currentStage: PlantStage;
    nextStage: PlantStage | null;
    progress: number; // 0-1
    minutesToNext: number;
} {
    const currentStage = getPlantStage(totalLifetimeEarned);
    const currentIdx = PLANT_STAGE_THRESHOLDS.findIndex(
        (t) => t.stage === currentStage
    );

    if (currentIdx === 0) {
        return { currentStage, nextStage: null, progress: 1, minutesToNext: 0 };
    }

    const nextThreshold = PLANT_STAGE_THRESHOLDS[currentIdx - 1];
    const currentThreshold = PLANT_STAGE_THRESHOLDS[currentIdx];
    const range = nextThreshold.min - currentThreshold.min;
    const progress = Math.min(
        (totalLifetimeEarned - currentThreshold.min) / range,
        1
    );

    return {
        currentStage,
        nextStage: nextThreshold.stage,
        progress,
        minutesToNext: Math.max(0, nextThreshold.min - totalLifetimeEarned),
    };
}

// ── Spend Costs ─────────────────────────────────────────────

export function getSpendCost(allowanceMinutes: number): number {
    const entry = SPEND_COSTS.find((c) => c.allowanceMinutes === allowanceMinutes);
    return entry?.cost ?? Math.ceil(allowanceMinutes * 1.5);
}

export function getSpendOptions(): typeof SPEND_COSTS {
    return SPEND_COSTS;
}

export function getDailyCap(): number {
    return DAILY_CAP;
}
