"use client";

import { useState, useEffect, useCallback } from "react";
import {
    loadState,
    getDisplayAge,
    formatPlantAge,
    getPlantStage,
    PLANT_STAGE_EMOJI,
} from "@/lib/plant-age";
import {
    getActiveSession,
    getCooldown,
    getCooldownRemaining,
    getPreferredTier,
    setPreferredTier,
    TIER_CONFIG,
    type Tier,
} from "@/lib/session-manager";
import { ChallengeView } from "./ChallengeView";
import { SpendView } from "./SpendView";
import { SessionTimer } from "./SessionTimer";
import { CooldownView } from "./CooldownView";

type GatePhase =
    | "select-tier"
    | "challenge"
    | "spend"
    | "challenge-and-spend"
    | "session-active"
    | "cooldown";

interface Props {
    appId?: string;
    appName?: string;
}

export function LockGateScreen({ appId = "demo", appName = "App" }: Props) {
    const [phase, setPhase] = useState<GatePhase>("select-tier");
    const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
    const [selectedAllowance, setSelectedAllowance] = useState(0);
    const [challengePassed, setChallengePassed] = useState(false);
    const [plantState, setPlantState] = useState(loadState());
    const [preferredTier, setPreferredTierState] = useState<Tier | null>(null);

    // Check for existing session or cooldown on mount
    useEffect(() => {
        const session = getActiveSession(appId);
        if (session) {
            setPhase("session-active");
            return;
        }
        const cooldown = getCooldown(appId);
        if (cooldown) {
            setPhase("cooldown");
            return;
        }

        const preferred = getPreferredTier(appId);
        if (preferred) {
            setPreferredTierState(preferred);
            setSelectedTier(preferred);
            setPhase(preferred === "hard" ? "challenge-and-spend" : "challenge");
        }
    }, [appId]);

    // Refresh plant state periodically
    useEffect(() => {
        const interval = setInterval(() => setPlantState(loadState()), 2000);
        return () => clearInterval(interval);
    }, []);

    const handleTierSelect = useCallback((tier: Tier) => {
        setPreferredTier(appId, tier);
        setPreferredTierState(tier);
        setSelectedTier(tier);
        setChallengePassed(false);
        if (tier === "easy") {
            setPhase("challenge");
        } else if (tier === "medium") {
            // Medium: user chooses challenge OR spend
            setPhase("challenge"); // default to challenge, can switch to spend
        } else {
            // Hard: must do challenge first, then spend
            setPhase("challenge-and-spend");
        }
    }, [appId]);

    const handleChallengeSuccess = useCallback(() => {
        setChallengePassed(true);
        if (selectedTier === "easy") {
            // Auto-start short session
            setSelectedAllowance(TIER_CONFIG.easy.allowanceOptions[0]);
            setPhase("session-active");
        } else if (selectedTier === "hard") {
            // Now need to spend
            setPhase("spend");
        } else {
            // Medium with challenge: start session
            setSelectedAllowance(TIER_CONFIG.medium.allowanceOptions[0]);
            setPhase("session-active");
        }
        setPlantState(loadState());
    }, [selectedTier]);

    const handleSpendSuccess = useCallback((allowanceMinutes: number) => {
        setSelectedAllowance(allowanceMinutes);
        setPhase("session-active");
        setPlantState(loadState());
    }, []);

    const handleSessionEnd = useCallback(() => {
        setPhase("cooldown");
        setPlantState(loadState());
    }, []);

    const handleCooldownEnd = useCallback(() => {
        setPhase("select-tier");
        setSelectedTier(null);
        setChallengePassed(false);
        setPlantState(loadState());
    }, []);

    const handleBack = useCallback(() => {
        setPhase("select-tier");
        setSelectedTier(null);
        setChallengePassed(false);
    }, []);

    const age = getDisplayAge(plantState.totalLifetimeEarned);
    const stage = getPlantStage(plantState.totalLifetimeEarned);

    // ── Render ──────────────────────────────────────────────

    if (phase === "session-active") {
        return (
            <SessionTimer
                appId={appId}
                appName={appName}
                allowanceMinutes={selectedAllowance}
                tier={selectedTier || "easy"}
                onSessionEnd={handleSessionEnd}
            />
        );
    }

    if (phase === "cooldown") {
        return (
            <CooldownView
                appId={appId}
                cooldownSeconds={getCooldownRemaining(appId)}
                onCooldownEnd={handleCooldownEnd}
            />
        );
    }

    if (phase === "challenge" || phase === "challenge-and-spend") {
        return (
            <ChallengeView
                appId={appId}
                difficulty={selectedTier || "easy"}
                tier={selectedTier || "easy"}
                onSuccess={handleChallengeSuccess}
                onBack={handleBack}
                onSwitchToSpend={
                    selectedTier === "medium" ? () => setPhase("spend") : undefined
                }
            />
        );
    }

    if (phase === "spend") {
        return (
            <SpendView
                tier={selectedTier || "medium"}
                appId={appId}
                onSuccess={handleSpendSuccess}
                onBack={handleBack}
                challengeRequired={selectedTier === "hard" && !challengePassed}
            />
        );
    }

    // ── Tier Selection ────────────────────────────────────────

    return (
        <div className="lg-container">
            <div className="lg-header">
                <div className="lg-app-badge">
                    <span className="lg-app-icon">🔒</span>
                    <span className="lg-app-name">{appName}</span>
                </div>
                <p className="lg-subtitle">This app is locked. Choose how to unlock:</p>
            </div>

            <div className="lg-plant-status">
                <span className="lg-plant-emoji">{PLANT_STAGE_EMOJI[stage]}</span>
                <div className="lg-plant-info">
                    <span className="lg-plant-age">{formatPlantAge(age)}</span>
                    <span className="lg-plant-balance">
                        {plantState.balance} Plant Minutes available
                    </span>
                </div>
            </div>

            {preferredTier && (
                <p className="lg-subtitle" style={{ marginBottom: 10 }}>
                    Preferred unlock mode: {preferredTier.toUpperCase()}
                </p>
            )}

            <div className="lg-tiers">
                {(Object.entries(TIER_CONFIG) as [Tier, typeof TIER_CONFIG.easy][]).map(
                    ([tier, config]) => (
                        <button
                            key={tier}
                            className={`lg-tier-card lg-tier-card--${tier}`}
                            onClick={() => handleTierSelect(tier)}
                        >
                            <div className="lg-tier-header">
                                <span className="lg-tier-label">{config.label}</span>
                                <span className="lg-tier-time">
                                    {config.allowanceOptions[0]}-
                                    {config.allowanceOptions[config.allowanceOptions.length - 1]}{" "}
                                    min
                                </span>
                            </div>
                            <p className="lg-tier-desc">{config.description}</p>
                            <div className="lg-tier-details">
                                {config.requireChallenge && (
                                    <span className="lg-tier-tag">🧩 Challenge</span>
                                )}
                                {tier === "medium" && (
                                    <span className="lg-tier-tag">💰 OR Spend</span>
                                )}
                                {config.requireSpend && (
                                    <span className="lg-tier-tag">💰 Must Spend</span>
                                )}
                                {config.cooldownMinutes.max > 0 && (
                                    <span className="lg-tier-tag">
                                        ⏱️ {config.cooldownMinutes.min}-{config.cooldownMinutes.max}m
                                        cooldown
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                )}
            </div>
        </div>
    );
}
