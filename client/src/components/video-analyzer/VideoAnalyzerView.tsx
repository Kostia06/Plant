"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Phase, AnalysisResult } from "./types";
import { useAnalysisHistory } from "./useAnalysisHistory";
import { IdleView } from "./IdleView";
import { LoadingView } from "./LoadingView";
import { ResultsView } from "./ResultsView";
import { ErrorView } from "./ErrorView";

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL ?? "http://localhost:8000";
const POLL_INTERVAL = 3000;

export function VideoAnalyzerView() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState("");
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { history, isLoading: isHistoryLoading, refetch } = useAnalysisHistory();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (id: string) => {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/status/${id}`);
          if (!res.ok) throw new Error("Failed to check status");

          const data = await res.json();

          if (data.status === "complete" && data.results) {
            stopPolling();
            setResults(data.results);
            setPhase("results");
            refetch();
          }

          if (data.status === "failed") {
            stopPolling();
            setError(data.error ?? "Analysis failed. Please try again.");
            setPhase("error");
          }
        } catch {
          stopPolling();
          setError("Lost connection to the server.");
          setPhase("error");
        }
      }, POLL_INTERVAL);
    },
    [stopPolling, refetch],
  );

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  const handleSubmit = async () => {
    if (!url.trim()) return;

    setPhase("loading");
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "Failed to start analysis");
      }

      const data = await res.json();

      if (data.status === "complete") {
        const statusRes = await fetch(`${API_URL}/api/status/${data.job_id}`);
        const statusData = await statusRes.json();
        setResults(statusData.results);
        setPhase("results");
        refetch();
      } else {
        pollStatus(data.job_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  const handleReset = () => {
    stopPolling();
    setPhase("idle");
    setUrl("");
    setResults(null);
    setError(null);
  };

  const handleSelectHistory = (result: AnalysisResult) => {
    setResults(result);
    setPhase("results");
  };

  return (
    <div className="page-container va-page">
      <div className="pg-back">
        <Link href="/settings" className="btn-link">
          &larr; Dashboard
        </Link>
      </div>

      <h1 className="page-title">Video Analyzer</h1>

      {phase === "idle" && (
        <IdleView
          url={url}
          onUrlChange={setUrl}
          onSubmit={handleSubmit}
          history={history}
          isHistoryLoading={isHistoryLoading}
          onSelectHistory={handleSelectHistory}
        />
      )}

      {phase === "loading" && <LoadingView />}

      {phase === "results" && results && (
        <ResultsView results={results} onReset={handleReset} />
      )}

      {phase === "error" && (
        <ErrorView
          message={error ?? "Something went wrong"}
          onRetry={handleReset}
        />
      )}
    </div>
  );
}
