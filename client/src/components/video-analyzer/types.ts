export interface Claim {
  claim: string;
  type: string;
  timestamp: string | null;
  verdict: string;
  confidence: number;
  explanation: string;
  evidence_for: string[];
  evidence_against: string[];
  sources: string[];
}

export interface BiasAnalysis {
  overall_bias: string;
  manipulation_tactics: string[];
  misleading_visuals: { timestamp: string; description: string }[];
}

export interface Perspectives {
  left: string;
  center: string;
  right: string;
}

export interface AnalysisResult {
  title: string;
  platform: string;
  duration_seconds: number | null;
  summary: string;
  transcript: string;
  claims: Claim[];
  perspectives: Perspectives;
  bias_analysis: BiasAnalysis;
  points_awarded: number;
}

export interface AnalysisHistoryItem {
  id: string;
  title: string | null;
  platform: string | null;
  summary: string | null;
  created_at: string;
  url: string;
  duration_seconds: number | null;
  claims: Claim[];
  perspectives: Perspectives;
  bias_analysis: BiasAnalysis;
  points_awarded: number;
  transcript: string | null;
}

export type Phase = "idle" | "loading" | "results" | "error";

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function verdictColor(verdict: string): string {
  switch (verdict.toLowerCase()) {
    case "true":
      return "va-verdict--true";
    case "false":
      return "va-verdict--false";
    case "misleading":
      return "va-verdict--misleading";
    default:
      return "va-verdict--unverified";
  }
}

export function biasColor(bias: string): string {
  const lower = bias.toLowerCase();
  if (lower === "none" || lower === "minimal") return "va-bias--low";
  if (lower === "moderate") return "va-bias--mid";
  return "va-bias--high";
}
