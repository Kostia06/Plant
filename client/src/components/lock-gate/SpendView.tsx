"use client";

import { useState } from "react";
import {
    loadState,
    spend,
    getSpendCost,
    getSpendOptions,
    getDisplayAge,
    formatPlantAge,
    PLANT_STAGE_EMOJI,
    getPlantStage,
} from "@/lib/plant-age";
import { TIER_CONFIG, type Tier } from "@/lib/session-manager";

interface Props {
    tier: Tier;
    appId: string;
    onSuccess: (allowanceMinutes: number) => void;
    onBack: () => void;
    challengeRequired?: boolean;
}

export function SpendView({ tier, onSuccess, onBack, challengeRequired }: Props) {
    const [plantState, setPlantState] = useState(loadState());
    const [error, setError] = useState<string | null>(null);
    const [spending, setSpending] = useState(false);

    const options = getSpendOptions();
    const tierConfig = TIER_CONFIG[tier];
    const age = getDisplayAge(plantState.totalLifetimeEarned);
    const stage = getPlantStage(plantState.totalLifetimeEarned);

    const handleSpend = (allowanceMinutes: number) => {
        if (challengeRequired) {
            setError("You must complete the challenge first!");
            return;
        }

        const cost = getSpendCost(allowanceMinutes);
        if (plantState.balance < cost) {
            setError(
                `Not enough Plant Minutes! Need ${cost}, have ${plantState.balance}.`
            );
            return;
        }

        setSpending(true);
        setError(null);
        const result = spend(cost);
        if (result.success) {
            setPlantState(result.state);
            setTimeout(() => onSuccess(allowanceMinutes), 500);
        } else {
            setError("Insufficient balance.");
            setSpending(false);
        }
    };

    // Filter allowance options by tier
    const allowedOptions = options.filter((opt) =>
        (tierConfig.allowanceOptions as readonly number[]).includes(opt.allowanceMinutes)
    );

    return (
        <div className="lg-container">
            <div className="sp-header">
                <button className="btn-link ch-back" onClick={onBack}>
                    ← Back
                </button>
                <h2 className="sp-title">Spend Plant Age</h2>
            </div>

            <div className="sp-balance-card">
                <span className="sp-balance-emoji">{PLANT_STAGE_EMOJI[stage]}</span>
                <div className="sp-balance-info">
                    <span className="sp-balance-age">{formatPlantAge(age)}</span>
                    <span className="sp-balance-minutes">
                        {plantState.balance} Plant Minutes
                    </span>
                </div>
            </div>

            <p className="sp-instruction">
                Choose how much time you want. The cost increases for longer sessions:
            </p>

            <div className="sp-options">
                {allowedOptions.map((opt) => {
                    const cost = getSpendCost(opt.allowanceMinutes);
                    const canAfford = plantState.balance >= cost;
                    return (
                        <button
                            key={opt.allowanceMinutes}
                            className={`sp-option ${!canAfford ? "sp-option--disabled" : ""}`}
                            onClick={() => handleSpend(opt.allowanceMinutes)}
                            disabled={!canAfford || spending}
                        >
                            <span className="sp-option-time">
                                {opt.allowanceMinutes} min
                            </span>
                            <span className="sp-option-cost">
                                Cost: {cost} PM
                            </span>
                            {!canAfford && (
                                <span className="sp-option-insufficient">
                                    Need {cost - plantState.balance} more
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {error && <p className="error-text sp-error">{error}</p>}

            {spending && (
                <div className="sp-spending">
                    <p>Spending Plant Minutes...</p>
                </div>
            )}
        </div>
    );
}
