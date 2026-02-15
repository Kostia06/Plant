"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    generateChallenge,
    checkAnswer,
    saveAdaptiveResult,
    type Challenge,
    type Difficulty,
} from "@/lib/challenge-engine";
import { startFailureCooldown, type Tier, TIER_CONFIG } from "@/lib/session-manager";
import { earn } from "@/lib/plant-age";

interface Props {
    appId: string;
    difficulty: Difficulty;
    tier: Tier;
    onSuccess: () => void;
    onBack: () => void;
    onSwitchToSpend?: () => void;
}

export function ChallengeView({
    appId,
    difficulty,
    tier,
    onSuccess,
    onBack,
    onSwitchToSpend,
}: Props) {
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [result, setResult] = useState<"correct" | "wrong" | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [failCount, setFailCount] = useState(0);
    const [locked, setLocked] = useState(false);
    const startTimeRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const maxFails = TIER_CONFIG[tier].maxFailsBeforeLockout;

    const newChallenge = useCallback(() => {
        const ch = generateChallenge(difficulty);
        setChallenge(ch);
        setSelectedAnswer(null);
        setResult(null);
        setTimeLeft(ch.timeLimitSec);
        startTimeRef.current = Date.now();
    }, [difficulty]);

    useEffect(() => {
        newChallenge();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [newChallenge]);

    // Timer countdown
    useEffect(() => {
        if (!challenge || result) return;
        timerRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const remaining = Math.max(0, challenge.timeLimitSec - elapsed);
            setTimeLeft(remaining);
            if (remaining <= 0) {
                handleTimeout();
            }
        }, 100);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challenge, result]);

    const handleTimeout = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setResult("wrong");
        const newFails = failCount + 1;
        setFailCount(newFails);
        saveAdaptiveResult(false, challenge?.timeLimitSec ? challenge.timeLimitSec * 1000 : 0);
        if (maxFails > 0 && newFails >= maxFails) {
            startFailureCooldown(appId);
            setLocked(true);
        }
    };

    const handleAnswer = (answerIdx: number) => {
        if (result || !challenge) return;
        if (timerRef.current) clearInterval(timerRef.current);

        setSelectedAnswer(answerIdx);
        const solveTime = Date.now() - startTimeRef.current;
        const correct = checkAnswer(challenge, answerIdx);
        saveAdaptiveResult(correct, solveTime);

        if (correct) {
            setResult("correct");
            if (challenge.pointsReward > 0) {
                earn(challenge.pointsReward);
            }
            setTimeout(() => onSuccess(), 1200);
        } else {
            setResult("wrong");
            const newFails = failCount + 1;
            setFailCount(newFails);
            if (maxFails > 0 && newFails >= maxFails) {
                startFailureCooldown(appId);
                setLocked(true);
            }
        }
    };

    if (locked) {
        return (
            <div className="lg-container">
                <div className="ch-locked">
                    <span className="ch-locked-icon">🔒</span>
                    <h2 className="ch-locked-title">Too Many Failures</h2>
                    <p className="ch-locked-text">
                        You&apos;ve failed {maxFails} times. Please wait 3 minutes before
                        trying again.
                    </p>
                    <button className="btn btn-primary" onClick={onBack}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!challenge) {
        return <div className="lg-container"><p className="loading-text">Loading challenge...</p></div>;
    }

    const timerPercent = (timeLeft / challenge.timeLimitSec) * 100;
    const timerUrgent = timeLeft <= 10;

    return (
        <div className="lg-container">
            <div className="ch-header">
                <button className="btn-link ch-back" onClick={onBack}>
                    ← Back
                </button>
                <span className={`ch-difficulty ch-difficulty--${difficulty}`}>
                    {difficulty.toUpperCase()}
                </span>
                {onSwitchToSpend && (
                    <button className="btn-link ch-switch" onClick={onSwitchToSpend}>
                        Spend instead →
                    </button>
                )}
            </div>

            <div className={`ch-timer-bar ${timerUrgent ? "ch-timer-bar--urgent" : ""}`}>
                <div
                    className="ch-timer-fill"
                    style={{ width: `${timerPercent}%` }}
                />
            </div>
            <div className="ch-timer-text">
                {Math.ceil(timeLeft)}s remaining
            </div>

            <div className="ch-prompt-card">
                <p className="ch-prompt">{challenge.prompt}</p>
            </div>

            <div className="ch-options">
                {challenge.options.map((option, idx) => {
                    let cls = "ch-option";
                    if (result && idx === challenge.correctAnswer) {
                        cls += " ch-option--correct";
                    } else if (result === "wrong" && idx === selectedAnswer) {
                        cls += " ch-option--wrong";
                    }
                    if (selectedAnswer === idx && !result) {
                        cls += " ch-option--selected";
                    }
                    return (
                        <button
                            key={idx}
                            className={cls}
                            onClick={() => handleAnswer(idx)}
                            disabled={result !== null}
                        >
                            <span className="ch-option-letter">
                                {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="ch-option-text">{option}</span>
                        </button>
                    );
                })}
            </div>

            {result && (
                <div className={`ch-result ch-result--${result}`}>
                    {result === "correct" ? (
                        <>
                            <span className="ch-result-icon">✅</span>
                            <span>Correct! Unlocking...</span>
                        </>
                    ) : (
                        <>
                            <span className="ch-result-icon">❌</span>
                            <span>
                                Wrong!{" "}
                                {maxFails > 0 && `(${failCount}/${maxFails} attempts)`}
                            </span>
                            {!locked && (
                                <button className="btn btn-sm ch-retry" onClick={newChallenge}>
                                    Try Again
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {failCount > 0 && !result && (
                <p className="ch-fail-count">
                    Failed attempts: {failCount}
                    {maxFails > 0 && ` / ${maxFails}`}
                </p>
            )}
        </div>
    );
}
