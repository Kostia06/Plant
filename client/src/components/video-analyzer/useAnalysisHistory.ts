"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AnalysisHistoryItem } from "./types";

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("video_analyses")
      .select("id, title, platform, summary, created_at, url, duration_seconds, claims, perspectives, bias_analysis, points_awarded, transcript")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistory(data as AnalysisHistoryItem[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, refetch: fetchHistory };
}
