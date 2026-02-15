"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150;

interface AnalysisResult {
  title: string;
  summary: string;
  claims: {
    claim: string;
    verdict: string;
    confidence: number;
    explanation: string;
  }[];
  bias_analysis: {
    overall_bias: string;
    manipulation_tactics: string[];
  };
  points_awarded: number;
}

const VERDICT_CLASS: Record<string, string> = {
  true: "verdict-true",
  misleading: "verdict-misleading",
  false: "verdict-false",
  unverified: "verdict-unverified",
};

export default function AnalyzePage() {
  const { user, loading: authLoading } = useAuth();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (jobId: string, attempt: number) => {
      if (attempt >= MAX_POLLS) {
        setError("Analysis timed out. Try a shorter video.");
        setAnalyzing(false);
        return;
      }

      try {
        const res = await fetch(`/api/analyze/status/${jobId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Status check failed");
          setAnalyzing(false);
          return;
        }

        if (data.status === "complete") {
          setResult(data.results);
          setStatus("");
          setAnalyzing(false);
          return;
        }

        if (data.status === "failed") {
          setError(data.error || "Analysis failed");
          setAnalyzing(false);
          return;
        }

        setStatus("Processing video...");
        pollRef.current = setTimeout(
          () => pollStatus(jobId, attempt + 1),
          POLL_INTERVAL_MS,
        );
      } catch {
        setError("Lost connection to analysis server");
        setAnalyzing(false);
      }
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !user) return;

    setError("");
    setResult(null);
    setAnalyzing(true);
    setStatus("Starting analysis...");
    stopPolling();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), user_id: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        setAnalyzing(false);
        return;
      }

      if (data.status === "complete") {
        const statusRes = await fetch(`/api/analyze/status/${data.job_id}`);
        const statusData = await statusRes.json();
        setResult(statusData.results);
        setStatus("");
        setAnalyzing(false);
        return;
      }

      pollStatus(data.job_id, 0);
    } catch {
      setError("Could not reach analysis server");
      setAnalyzing(false);
    }
  };

  if (authLoading) {
    return <p className="loading-text">Loading...</p>;
  }

  if (!user) {
    return (
      <div className="page-center">
        <div className="card">
          <h2 className="card-title">Login Required</h2>
          <Link href="/app/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl text-deep-forest">Analyze Video</h2>

      <form onSubmit={handleSubmit} className="card">
        <p className="card-subtitle">
          Paste a video URL to analyze its claims for accuracy.
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input"
            required
          />
          <button
            type="submit"
            disabled={analyzing || !url.trim()}
            className="btn btn-primary"
          >
            {analyzing ? status || "Analyzing..." : "Analyze"}
          </button>
        </div>
        {error && <p className="error-text" style={{ marginTop: "0.5rem" }}>{error}</p>}
      </form>

      {result && (
        <>
          <div className="card">
            <h3 className="card-title">{result.title}</h3>
            <p className="card-subtitle">{result.summary}</p>
            {result.points_awarded > 0 && (
              <p className="feed-points" style={{ marginTop: "0.5rem" }}>
                +{result.points_awarded} pts earned
              </p>
            )}
          </div>

          {result.claims.length > 0 && (
            <div className="card">
              <h3 className="card-title">Claims ({result.claims.length})</h3>
              <div className="claim-list">
                {result.claims.map((c, i) => (
                  <div key={i} className="claim-item">
                    <div className="claim-header">
                      <span className={`claim-verdict ${VERDICT_CLASS[c.verdict] || ""}`}>
                        [{c.verdict.toUpperCase()}]
                      </span>
                      <span className="claim-confidence">
                        {Math.round(c.confidence * 100)}%
                      </span>
                    </div>
                    <p className="claim-text">{c.claim}</p>
                    <p className="claim-explanation">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.bias_analysis && (
            <div className="card">
              <h3 className="card-title">Bias Analysis</h3>
              <p className="card-subtitle">
                Overall bias: <strong>{result.bias_analysis.overall_bias}</strong>
              </p>
              {result.bias_analysis.manipulation_tactics.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <p className="card-subtitle">Tactics detected:</p>
                  <div className="tactic-list">
                    {result.bias_analysis.manipulation_tactics.map((t) => (
                      <span key={t} className="tactic-tag">{t.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
