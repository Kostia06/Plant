"use client";

import { useState, useEffect } from "react";
import {
    earn,
    getDailyCap,
    loadState,
    ACTIVITY_REWARDS,
    type PlantMinutesState,
} from "@/lib/plant-age";
import Link from "next/link";

export function EarnActivitiesView() {
    const [state, setState] = useState<PlantMinutesState>(loadState());
    const [justEarned, setJustEarned] = useState<string | null>(null);

    useEffect(() => {
        setState(loadState());
    }, []);

    const handleEarn = (id: string, amount: number) => {
        const result = earn(amount);
        if (result.success) {
            setState(result.state);
            setJustEarned(id);
            setTimeout(() => setJustEarned(null), 2000);
        }
    };

    const progress = (state.earnedToday / getDailyCap()) * 100;

    return (
        <div className="page-container ea-page">
            <div className="pg-back">
                <Link href="/app" className="btn-link">
                    ← Dashboard
                </Link>
            </div>

            <h1 className="page-title">Earn Plant Minutes</h1>

            <div className="ea-cap-card">
                <div className="ea-cap-header">
                    <span>Daily Cap</span>
                    <span>
                        {state.earnedToday} / {getDailyCap()} PM
                    </span>
                </div>
                <div className="ea-cap-track">
                    <div className="ea-cap-fill" style={{ width: `${progress}%` }} />
                </div>
                {state.earnedToday >= getDailyCap() && (
                    <p className="ea-cap-maxed">Daily cap reached! Come back tomorrow.</p>
                )}
            </div>

            <div className="ea-balance-row">
                <span>Current Balance:</span>
                <span className="pa-balance-value">{state.balance} PM</span>
            </div>

            <div className="ea-activity-list">
                {ACTIVITY_REWARDS.map((activity) => (
                    <div key={activity.id} className="ea-activity-card">
                        <div className="ea-activity-header">
                            <span className="ea-activity-icon">{activity.icon}</span>
                            <div className="ea-activity-info">
                                <span className="ea-activity-name">{activity.name}</span>
                                <span className="ea-activity-reward">+{activity.reward} PM</span>
                            </div>
                        </div>

                        <div className="ea-activity-actions">
                            {justEarned === activity.id ? (
                                <span className="ea-activity-done">Earned! +{activity.reward}</span>
                            ) : (
                                <button
                                    className="btn btn-sm ea-quick-btn"
                                    onClick={() => handleEarn(activity.id, activity.reward)}
                                    disabled={state.earnedToday >= getDailyCap()}
                                >
                                    Quick Complete (Demo)
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
