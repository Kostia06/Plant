"use client";

import { useState, useEffect, useRef } from "react";
import {
    startSession,
    getRemainingSeconds,
    endSession,
    getActiveSession,
    formatCountdown,
    type Tier,
} from "@/lib/session-manager";

interface Props {
    appId: string;
    appName: string;
    allowanceMinutes: number;
    tier: Tier;
    onSessionEnd: () => void;
}

export function SessionTimer({
    appId,
    appName,
    allowanceMinutes,
    tier,
    onSessionEnd,
}: Props) {
    const [remaining, setRemaining] = useState(allowanceMinutes * 60);
    const [warning, setWarning] = useState(false);
    const [ended, setEnded] = useState(false);
    const sessionRef = useRef(getActiveSession(appId));

    useEffect(() => {
        // Start or resume session
        if (!sessionRef.current) {
            sessionRef.current = startSession(appId, allowanceMinutes, tier);
        }

        const interval = setInterval(() => {
            if (!sessionRef.current) return;
            const rem = getRemainingSeconds(sessionRef.current);
            setRemaining(rem);

            if (rem <= 30 && rem > 0) {
                setWarning(true);
            }

            if (rem <= 0) {
                clearInterval(interval);
                endSession(appId);
                setEnded(true);
                setTimeout(() => onSessionEnd(), 2000);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [appId, allowanceMinutes, tier, onSessionEnd]);

    const totalSeconds = allowanceMinutes * 60;
    const progress = ((totalSeconds - remaining) / totalSeconds) * 100;

    if (ended) {
        return (
            <div className="st-container st-container--ended">
                <div className="st-ended">
                    <span className="st-ended-icon">🔒</span>
                    <h2 className="st-ended-title">Time&apos;s Up!</h2>
                    <p className="st-ended-text">{appName} is now locked again.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`st-container ${warning ? "st-container--warning" : ""}`}>
            <div className="st-bar">
                <div className="st-bar-fill" style={{ width: `${100 - progress}%` }} />
            </div>

            <div className="st-info">
                <div className="st-app">
                    <span className="st-app-icon">📱</span>
                    <span className="st-app-name">{appName}</span>
                </div>

                <div className="st-time">
                    <span className={`st-countdown ${warning ? "st-countdown--urgent" : ""}`}>
                        {formatCountdown(remaining)}
                    </span>
                    <span className="st-label">remaining</span>
                </div>
            </div>

            {warning && (
                <div className="st-warning">
                    <p>⚠️ Wrap up! Save your work and close the app.</p>
                </div>
            )}

            <button
                className="btn btn-sm st-end-btn"
                onClick={() => {
                    endSession(appId);
                    setEnded(true);
                    setTimeout(() => onSessionEnd(), 500);
                }}
            >
                End Session Early
            </button>
        </div>
    );
}
