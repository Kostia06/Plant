"use client";

// ── Session & Cooldown Manager ──────────────────────────────
// Tracks allowance windows (timed app usage) and cooldowns.

const SESSIONS_KEY = "plant_sessions";
const COOLDOWNS_KEY = "plant_cooldowns";
const SETTINGS_KEY = "plant_lock_settings";

export type Tier = "easy" | "medium" | "hard";
export type LockMode = "pomodoro" | "strict";

export interface Session {
    appId: string;
    startTime: number; // ms timestamp
    allowedSeconds: number;
    tierUsed: Tier;
    active: boolean;
}

export interface Cooldown {
    appId: string;
    endsAt: number; // ms timestamp
    tier: Tier;
}

export interface LockSettings {
    mode: LockMode;
    tierPerCategory: Record<string, Tier>;
}

// ── Tier Configurations ─────────────────────────────────────

export const TIER_CONFIG = {
    easy: {
        label: "Easy Pass",
        description: "Quick challenge, short access",
        allowanceOptions: [2, 3, 5], // minutes
        cooldownMinutes: { min: 0, max: 0 },
        requireChallenge: true,
        requireSpend: false,
        maxFailsBeforeLockout: 0,
        color: "var(--spring-canopy)",
    },
    medium: {
        label: "Medium",
        description: "Solve a challenge OR spend Plant Age",
        allowanceOptions: [5, 10, 20], // minutes
        cooldownMinutes: { min: 2, max: 5 },
        requireChallenge: false, // can choose challenge OR spend
        requireSpend: false,
        maxFailsBeforeLockout: 0,
        color: "var(--golden-sap)",
    },
    hard: {
        label: "Hard",
        description: "Challenge + spend, long cooldown",
        allowanceOptions: [5, 10], // minutes
        cooldownMinutes: { min: 5, max: 10 },
        requireChallenge: true,
        requireSpend: true,
        maxFailsBeforeLockout: 3,
        color: "var(--berry-red)",
    },
} as const;

export const MODE_CONFIG: Record<LockMode, { allowed: number; locked: number }> = {
    pomodoro: { allowed: 10, locked: 5 },
    strict: { allowed: 5, locked: 10 },
};

// ── Session Management ──────────────────────────────────────

function loadSessions(): Session[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveSessions(sessions: Session[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function startSession(
    appId: string,
    allowedMinutes: number,
    tier: Tier
): Session {
    const sessions = loadSessions();
    // End any existing session for this app
    const updated = sessions.map((s) =>
        s.appId === appId ? { ...s, active: false } : s
    );

    const session: Session = {
        appId,
        startTime: Date.now(),
        allowedSeconds: allowedMinutes * 60,
        tierUsed: tier,
        active: true,
    };
    updated.push(session);
    saveSessions(updated);
    return session;
}

export function getActiveSession(appId: string): Session | null {
    const sessions = loadSessions();
    const session = sessions.find((s) => s.appId === appId && s.active);
    if (!session) return null;

    // Check if session has expired
    const elapsed = (Date.now() - session.startTime) / 1000;
    if (elapsed >= session.allowedSeconds) {
        endSession(appId);
        return null;
    }
    return session;
}

export function getRemainingSeconds(session: Session): number {
    const elapsed = (Date.now() - session.startTime) / 1000;
    return Math.max(0, session.allowedSeconds - elapsed);
}

export function endSession(appId: string): void {
    const sessions = loadSessions();
    const session = sessions.find((s) => s.appId === appId && s.active);
    if (!session) return;

    const updated = sessions.map((s) =>
        s.appId === appId && s.active ? { ...s, active: false } : s
    );
    saveSessions(updated);

    // Start cooldown
    const tierCfg = TIER_CONFIG[session.tierUsed];
    const cooldownMin = tierCfg.cooldownMinutes.min;
    const cooldownMax = tierCfg.cooldownMinutes.max;
    if (cooldownMax > 0) {
        const cooldownMinutes =
            cooldownMin + Math.random() * (cooldownMax - cooldownMin);
        startCooldown(appId, cooldownMinutes, session.tierUsed);
    }
}

// ── Cooldown Management ─────────────────────────────────────

function loadCooldowns(): Cooldown[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(COOLDOWNS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveCooldowns(cooldowns: Cooldown[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(cooldowns));
}

function startCooldown(appId: string, minutes: number, tier: Tier): void {
    const cooldowns = loadCooldowns().filter((c) => c.appId !== appId);
    cooldowns.push({
        appId,
        endsAt: Date.now() + minutes * 60 * 1000,
        tier,
    });
    saveCooldowns(cooldowns);
}

export function getCooldown(appId: string): Cooldown | null {
    const cooldowns = loadCooldowns();
    const cd = cooldowns.find((c) => c.appId === appId);
    if (!cd) return null;
    if (Date.now() >= cd.endsAt) {
        // Cooldown has expired, clean up
        saveCooldowns(cooldowns.filter((c) => c.appId !== appId));
        return null;
    }
    return cd;
}

export function isCoolingDown(appId: string): boolean {
    return getCooldown(appId) !== null;
}

export function getCooldownRemaining(appId: string): number {
    const cd = getCooldown(appId);
    if (!cd) return 0;
    return Math.max(0, Math.ceil((cd.endsAt - Date.now()) / 1000));
}

export function startFailureCooldown(appId: string): void {
    startCooldown(appId, 3, "hard"); // 3-minute lockout after failures
}

// ── Settings ────────────────────────────────────────────────

export function getSettings(): LockSettings {
    if (typeof window === "undefined")
        return { mode: "pomodoro", tierPerCategory: {} };
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { mode: "pomodoro", tierPerCategory: {} };
        return JSON.parse(raw) as LockSettings;
    } catch {
        return { mode: "pomodoro", tierPerCategory: {} };
    }
}

export function updateSettings(updates: Partial<LockSettings>): LockSettings {
    const current = getSettings();
    const updated = { ...current, ...updates };
    if (typeof window !== "undefined") {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    }
    return updated;
}

export function getPreferredTier(appId: string): Tier | null {
    const settings = getSettings();
    const tier = settings.tierPerCategory[appId];
    if (tier === "easy" || tier === "medium" || tier === "hard") return tier;
    return null;
}

export function setPreferredTier(appId: string, tier: Tier): LockSettings {
    const settings = getSettings();
    return updateSettings({
        ...settings,
        tierPerCategory: {
            ...settings.tierPerCategory,
            [appId]: tier,
        },
    });
}

// ── Helpers ─────────────────────────────────────────────────

export function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}
