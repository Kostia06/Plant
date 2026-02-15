"use client";

import { useState, useEffect } from "react";
import { formatCountdown } from "@/lib/session-manager";
import Link from "next/link";

interface Props {
    appId: string;
    cooldownSeconds: number;
    onCooldownEnd: () => void;
}

export function CooldownView({ cooldownSeconds, onCooldownEnd }: Props) {
    const [remaining, setRemaining] = useState(cooldownSeconds);

    useEffect(() => {
        if (remaining <= 0) {
            onCooldownEnd();
            return;
        }
        const interval = setInterval(() => {
            setRemaining((prev) => {
                const next = prev - 0.2;
                if (next <= 0) {
                    clearInterval(interval);
                    setTimeout(() => onCooldownEnd(), 200);
                    return 0;
                }
                return next;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [remaining, onCooldownEnd]);

    const progress = cooldownSeconds > 0
        ? ((cooldownSeconds - remaining) / cooldownSeconds) * 100
        : 100;

    return (
        <div className="lg-container">
            <div className="cd-card">
                <span className="cd-icon">⏳</span>
                <h2 className="cd-title">Cooling Down</h2>
                <p className="cd-time">{formatCountdown(remaining)}</p>

                <div className="cd-progress-track">
                    <div
                        className="cd-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <p className="cd-subtitle">
                    Take a break. Your mind will thank you!
                </p>
            </div>

            <div className="cd-earn-section">
                <h3 className="cd-earn-title">While you wait, earn Plant Minutes:</h3>
                <div className="cd-earn-list">
                    <Link href="/settings/reflections" className="cd-earn-item">
                        <span className="cd-earn-icon">📝</span>
                        <div className="cd-earn-info">
                            <span className="cd-earn-name">Write a Reflection</span>
                            <span className="cd-earn-reward">+15 Plant Minutes</span>
                        </div>
                    </Link>
                    <Link href="/settings/teasers" className="cd-earn-item">
                        <span className="cd-earn-icon">🧩</span>
                        <div className="cd-earn-info">
                            <span className="cd-earn-name">Brain Teasers</span>
                            <span className="cd-earn-reward">+8 Plant Minutes</span>
                        </div>
                    </Link>
                    <Link href="/settings/analyze" className="cd-earn-item">
                        <span className="cd-earn-icon">📹</span>
                        <div className="cd-earn-info">
                            <span className="cd-earn-name">Fact-Check a Video</span>
                            <span className="cd-earn-reward">+10 Plant Minutes</span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
