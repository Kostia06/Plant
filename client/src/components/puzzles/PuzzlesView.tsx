"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeviceId } from "@/lib/hooks/use-device-id";
import { getTopicById } from "@/lib/puzzle-topics";
import { usePuzzleSession } from "./usePuzzleSession";
import { TopicSelectionView } from "./TopicSelectionView";
import { PuzzlePlayView } from "./PuzzlePlayView";
import { SetCompleteView } from "./SetCompleteView";
import type { PuzzlePhase, PuzzleForClient } from "./types";

export function PuzzlesView() {
  const deviceId = useDeviceId();
  const router = useRouter();
  const session = usePuzzleSession(deviceId);

  const [phase, setPhase] = useState<PuzzlePhase>("topic-select");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [puzzles, setPuzzles] = useState<PuzzleForClient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [error, setError] = useState("");

  const handleSelectTopic = useCallback(
    async (topicId: string) => {
      if (!deviceId) return;

      setSelectedTopicId(topicId);
      setPhase("loading");
      setError("");

      try {
        const result = await session.fetchDailyPuzzles(topicId);
        const fetched = result.puzzles;
        setPuzzles(fetched);
        setStartedAt(result.started_at);

        const allAttempted = fetched.every((p) => p.attempted);
        if (allAttempted) {
          setPhase("set-complete");
          return;
        }

        const firstUnattempted = fetched.findIndex((p) => !p.attempted);
        setCurrentIndex(firstUnattempted >= 0 ? firstUnattempted : 0);
        setPhase("playing");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load puzzles");
        setPhase("error");
      }
    },
    [deviceId, session],
  );

  const handleAnswerSubmitted = useCallback(
    async (
      puzzleId: string,
      answer: number,
      puzzleStartedAt: string,
      hintUsed: boolean,
    ) => {
      const result = await session.submitPuzzleAnswer(
        puzzleId,
        answer,
        puzzleStartedAt,
        hintUsed,
      );

      setPuzzles((prev) =>
        prev.map((p) =>
          p.id === puzzleId
            ? {
                ...p,
                attempted: true,
                is_correct: result.is_correct,
                correct_index: result.correct_index,
                explanation: result.explanation,
                points_earned: result.points_earned,
                user_answer: answer,
              }
            : p,
        ),
      );

      return result;
    },
    [session],
  );

  const handleNextPuzzle = useCallback(() => {
    const nextUnattempted = puzzles.findIndex(
      (p, i) => i > currentIndex && !p.attempted,
    );

    if (nextUnattempted >= 0) {
      setCurrentIndex(nextUnattempted);
      return;
    }

    const anyRemaining = puzzles.findIndex((p) => !p.attempted);
    if (anyRemaining >= 0) {
      setCurrentIndex(anyRemaining);
      return;
    }

    setPhase("set-complete");
  }, [puzzles, currentIndex]);

  const handleReset = useCallback(async () => {
    setPhase("topic-select");
    setPuzzles([]);
    setCurrentIndex(0);
    setStartedAt("");
    setError("");
    await session.refreshStats();
  }, [session]);

  const currentPuzzle = puzzles[currentIndex];
  const topicName = getTopicById(selectedTopicId)?.name ?? selectedTopicId;
  const totalPoints = puzzles.reduce((sum, p) => sum + (p.points_earned ?? 0), 0);

  return (
    <div className="page-container tz-page">
      <div className="pg-back">
        <Link href="/settings" className="btn-link">
          &larr; Dashboard
        </Link>
      </div>

      <h1 className="page-title">Brain Teasers</h1>

      {phase === "topic-select" && (
        <TopicSelectionView
          limits={session.limits}
          topicStats={session.topicStats}
          recommendedTopicId={session.recommendedTopicId}
          isLoading={session.isLoadingStats}
          history={session.history}
          onSelectTopic={handleSelectTopic}
        />
      )}

      {phase === "loading" && (
        <div className="tz-loading">
          <div className="va-spinner">
            <span className="va-leaf">&#x1F331;</span>
            <span className="va-leaf va-leaf--2">&#x1F33F;</span>
            <span className="va-leaf va-leaf--3">&#x1F343;</span>
          </div>
          <p className="va-loading-text">Growing puzzles...</p>
          <p className="va-loading-sub">Preparing your brain teasers</p>
        </div>
      )}

      {phase === "playing" && currentPuzzle && (
        <PuzzlePlayView
          puzzle={currentPuzzle}
          puzzleNumber={currentIndex + 1}
          totalPuzzles={puzzles.length}
          startedAt={startedAt}
          hintsRemaining={session.limits.hints_remaining}
          onSubmitAnswer={handleAnswerSubmitted}
          onRequestHint={session.fetchHint}
          onNext={handleNextPuzzle}
        />
      )}

      {phase === "set-complete" && (
        <SetCompleteView
          puzzles={puzzles}
          totalPoints={totalPoints}
          topicName={topicName}
          onTryAnotherTopic={handleReset}
          onBackToDashboard={() => router.push("/settings")}
        />
      )}

      {phase === "error" && (
        <div className="va-error">
          <span className="va-error-icon">&#x26A0;</span>
          <p className="va-error-text">{error}</p>
          <button className="btn btn-primary" onClick={handleReset}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
