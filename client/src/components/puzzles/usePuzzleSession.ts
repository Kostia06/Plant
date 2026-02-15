import { useState, useEffect, useCallback } from "react";
import {
  getDailyPuzzles,
  submitAnswer,
  getHint,
  getTopicStats,
  getUserPuzzleHistory,
} from "@/lib/puzzle-engine";
import type {
  PuzzleForClient,
  PuzzleLimits,
  TopicStat,
  SubmitResultData,
  HintResultData,
  HistoryAttempt,
} from "./types";

const DEFAULT_LIMITS: PuzzleLimits = {
  daily_puzzles_attempted: 0,
  daily_puzzles_remaining: 3,
  custom_puzzles_generated: 0,
  custom_puzzles_remaining: 5,
  hints_used: 0,
  hints_remaining: 3,
};

export function usePuzzleSession(deviceId: string) {
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [recommendedTopicId, setRecommendedTopicId] = useState("media_literacy");
  const [limits, setLimits] = useState<PuzzleLimits>(DEFAULT_LIMITS);
  const [history, setHistory] = useState<HistoryAttempt[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!deviceId) return;

    async function load() {
      try {
        const [statsResult, historyResult] = await Promise.all([
          getTopicStats(deviceId),
          getUserPuzzleHistory(deviceId, 10),
        ]);
        setTopicStats(statsResult.topicStats);
        setRecommendedTopicId(statsResult.recommended);
        setHistory(historyResult.history as unknown as HistoryAttempt[]);
      } catch {
        // Stats are non-critical, defaults are fine
      } finally {
        setIsLoadingStats(false);
      }
    }

    load();
  }, [deviceId]);

  const fetchDailyPuzzles = useCallback(
    async (topicId: string): Promise<{
      puzzles: PuzzleForClient[];
      started_at: string;
      limits: PuzzleLimits;
    }> => {
      const result = await getDailyPuzzles(topicId, deviceId);
      const newLimits = result.limits as unknown as PuzzleLimits;
      setLimits(newLimits);
      return { ...result, limits: newLimits };
    },
    [deviceId],
  );

  const submitPuzzleAnswer = useCallback(
    async (
      puzzleId: string,
      userAnswer: number,
      startedAt: string,
      hintUsed: boolean,
    ): Promise<SubmitResultData> => {
      const result = await submitAnswer(
        deviceId,
        puzzleId,
        userAnswer,
        startedAt,
        hintUsed,
      );
      setLimits((prev) => ({
        ...prev,
        daily_puzzles_attempted: prev.daily_puzzles_attempted + 1,
        daily_puzzles_remaining: Math.max(0, prev.daily_puzzles_remaining - 1),
      }));
      return result;
    },
    [deviceId],
  );

  const fetchHint = useCallback(
    async (puzzleId: string): Promise<HintResultData> => {
      const result = await getHint(deviceId, puzzleId);
      if (!result.error) {
        setLimits((prev) => ({
          ...prev,
          hints_used: prev.hints_used + 1,
          hints_remaining: result.hints_remaining,
        }));
      }
      return result;
    },
    [deviceId],
  );

  const refreshStats = useCallback(async () => {
    if (!deviceId) return;
    try {
      const [statsResult, historyResult] = await Promise.all([
        getTopicStats(deviceId),
        getUserPuzzleHistory(deviceId, 10),
      ]);
      setTopicStats(statsResult.topicStats);
      setRecommendedTopicId(statsResult.recommended);
      setHistory(historyResult.history as unknown as HistoryAttempt[]);
    } catch {
      // Non-critical
    }
  }, [deviceId]);

  return {
    topicStats,
    recommendedTopicId,
    limits,
    history,
    isLoadingStats,
    fetchDailyPuzzles,
    submitPuzzleAnswer,
    fetchHint,
    refreshStats,
  };
}
