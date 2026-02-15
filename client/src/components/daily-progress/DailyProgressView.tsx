"use client";

import { useState, useEffect } from "react";
import {
    loadState,
    getDailyCap,
    type PlantMinutesState,
    getDisplayAge,
    formatPlantAge,
    getPlantStage,
    PLANT_STAGE_EMOJI,
} from "@/lib/plant-age";
import Link from "next/link";

export function DailyProgressView() {
    const [state, setState] = useState<PlantMinutesState>(loadState());

    useEffect(() => {
        setState(loadState());
    }, []);

    const cap = getDailyCap();
    const progress = Math.min(state.earnedToday / cap, 1);
    const perimeter = 2 * Math.PI * 90; // r=90, c=~565
    const strokeDashoffset = perimeter - progress * perimeter;

    const age = getDisplayAge(state.totalLifetimeEarned);
    const stage = getPlantStage(state.totalLifetimeEarned);

    return (
        <div className="page-container dp-page">
            <div className="pg-back">
                <Link href="/settings" className="btn-link">
                    ← Dashboard
                </Link>
            </div>

            <h1 className="page-title">Daily Progress</h1>

            <div className="dp-circle-section">
                <div className="dp-circle">
                    <svg className="dp-circle-svg" width="240" height="240">
                        <circle
                            cx="120"
                            cy="120"
                            r="90"
                            fill="none"
                            stroke="#e6f0e6"
                            strokeWidth="16"
                        />
                        <circle
                            className="dp-circle-progress"
                            cx="120"
                            cy="120"
                            r="90"
                            fill="none"
                            stroke="var(--fern-green)"
                            strokeWidth="16"
                            strokeDasharray={perimeter}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90 120 120)"
                        />
                    </svg>
                    <div className="dp-circle-text">
                        <span className="dp-circle-value">
                            {Math.floor(progress * 100)}%
                        </span>
                        <span className="dp-circle-label">of Daily Goal</span>
                        {progress >= 1 && <span className="dp-cap-badge">Cap Reached!</span>}
                    </div>
                </div>
                <span className="dp-circle-subtitle">
                    {state.earnedToday} / {cap} Plant Minutes earned today
                </span>
            </div>

            <div className="card dp-plant-card">
                <div className="dp-plant-row">
                    <span className="dp-plant-emoji">{PLANT_STAGE_EMOJI[stage]}</span>
                    <div className="dp-plant-info">
                        <span className="dp-plant-stage">Plant Status</span>
                        <span className="dp-plant-age">Age: {formatPlantAge(age)}</span>
                    </div>
                    <div className="dp-plant-balance">
                        <span className="dp-balance-num">{state.totalLifetimeEarned}</span>
                        <span className="dp-balance-label">Total Lifetime Earned</span>
                    </div>
                </div>
            </div>

            <div className="card dp-breakdown-card">
                <h3>Earning Breakdown</h3>
                <p>You can earn up to {cap} PM per day by completing activities.</p>
                <div className="dp-activity-list">
                    <div className="dp-activity-row">
                        <span>📝</span>
                        <span>Reflection</span>
                        <span>+15</span>
                        <span className="dp-activity-max">(max 1/day)</span>
                    </div>
                    <div className="dp-activity-row">
                        <span>🧩</span>
                        <span>Brain Teaser</span>
                        <span>+8</span>
                        <span className="dp-activity-max">(max 3/day)</span>
                    </div>
                    <div className="dp-activity-row">
                        <span>📹</span>
                        <span>Video Check</span>
                        <span>+10</span>
                        <span className="dp-activity-max">(max 5/day)</span>
                    </div>
                </div>
                <Link href="/settings/earn" className="btn btn-primary dp-earn-btn">
                    Go Earn More
                </Link>
            </div>
        </div>
    );
}
