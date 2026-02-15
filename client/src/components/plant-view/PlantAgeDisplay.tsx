"use client";

import {
    type PlantAgeDisplay as PAD,
    formatPlantAge,
    type PlantStage,
    getNextStageProgress,
    PLANT_STAGE_LABELS,
} from "@/lib/plant-age";

interface Props {
    age: PAD;
    balance: number;
    totalLifetimeEarned: number;
}

export function PlantAgeDisplay({ age, balance, totalLifetimeEarned }: Props) {
    const { nextStage, progress, minutesToNext } = getNextStageProgress(totalLifetimeEarned);

    return (
        <div className="pa-container">
            <div className="pa-age-row">
                <div className="pa-age-unit">
                    <span className="pa-age-value">{age.years}</span>
                    <span className="pa-age-label">Years</span>
                </div>
                <span className="pa-age-sep">:</span>
                <div className="pa-age-unit">
                    <span className="pa-age-value">{age.days}</span>
                    <span className="pa-age-label">Days</span>
                </div>
                <span className="pa-age-sep">:</span>
                <div className="pa-age-unit">
                    <span className="pa-age-value">{age.minutes}</span>
                    <span className="pa-age-label">Mins</span>
                </div>
            </div>

            <div className="pa-balance">
                <span className="pa-balance-value">{balance} PM</span>
                <span className="pa-balance-label">Available to Spend</span>
            </div>

            {nextStage && (
                <div className="pa-progress-section">
                    <div className="pa-progress-labels">
                        <span>Next: {PLANT_STAGE_LABELS[nextStage]}</span>
                        <span>{Math.floor(progress * 100)}%</span>
                    </div>
                    <div className="pa-progress-track">
                        <div
                            className="pa-progress-fill"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                    <span className="pa-progress-remaining">
                        {minutesToNext} mins to grow
                    </span>
                </div>
            )}
        </div>
    );
}
