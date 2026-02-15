"use client";

import { useState } from "react";
import type { AnalysisResult, Claim } from "./types";
import { formatDuration, verdictColor, biasColor } from "./types";

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Collapsible({ title, defaultOpen = false, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="va-collapsible">
      <button
        className="va-collapsible-header"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <span className="va-collapsible-arrow">{isOpen ? "[-]" : "[+]"}</span>
      </button>
      {isOpen && <div className="va-collapsible-body">{children}</div>}
    </div>
  );
}

function ClaimCard({ claim }: { claim: Claim }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const hasEvidence = claim.evidence_for.length > 0 || claim.evidence_against.length > 0;

  return (
    <div className={`va-claim-card ${isOpen ? "va-claim-card--open" : ""}`}>
      <button
        className="va-claim-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className={`va-verdict ${verdictColor(claim.verdict)}`}>
          {claim.verdict}
        </span>
        <span className="va-claim-preview">{claim.claim}</span>
        <span className="va-collapsible-arrow">{isOpen ? "[-]" : "[+]"}</span>
      </button>

      {isOpen && (
        <div className="va-claim-body">
          <div className="va-claim-confidence-row">
            <div className="va-confidence">
              <div className="va-confidence-track">
                <div
                  className="va-confidence-fill"
                  style={{ width: `${claim.confidence * 100}%` }}
                />
              </div>
              <span className="va-confidence-label">
                {Math.round(claim.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          <p className="va-claim-explanation">{claim.explanation}</p>

          {hasEvidence && (
            <>
              <button
                className="btn-link va-evidence-toggle"
                onClick={() => setShowEvidence((prev) => !prev)}
              >
                {showEvidence ? "Hide evidence" : "Show evidence"}
              </button>

              {showEvidence && (
                <div className="va-evidence">
                  {claim.evidence_for.length > 0 && (
                    <div className="va-evidence-group">
                      <span className="va-evidence-label va-evidence-label--for">
                        Supporting
                      </span>
                      <ul className="va-evidence-list">
                        {claim.evidence_for.map((e, j) => (
                          <li key={j}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {claim.evidence_against.length > 0 && (
                    <div className="va-evidence-group">
                      <span className="va-evidence-label va-evidence-label--against">
                        Contradicting
                      </span>
                      <ul className="va-evidence-list">
                        {claim.evidence_against.map((e, j) => (
                          <li key={j}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ResultsViewProps {
  results: AnalysisResult;
  onReset: () => void;
}

export function ResultsView({ results, onReset }: ResultsViewProps) {
  const hasPerspectives =
    results.perspectives.left ||
    results.perspectives.center ||
    results.perspectives.right;

  return (
    <div className="va-results">
      {/* Header */}
      <div className="card va-header-card">
        <h2 className="va-title">{results.title || "Untitled Video"}</h2>
        <div className="va-meta">
          {results.platform && (
            <span className="va-platform-badge">{results.platform}</span>
          )}
          {results.duration_seconds != null && (
            <span className="va-duration">
              {formatDuration(results.duration_seconds)}
            </span>
          )}
          <span className="va-points">+{results.points_awarded} PM</span>
        </div>
      </div>

      {/* Summary */}
      {results.summary && (
        <Collapsible title="Summary" defaultOpen>
          <p className="va-summary-text">{results.summary}</p>
        </Collapsible>
      )}

      {/* Claims — each individually foldable */}
      {results.claims.length > 0 && (
        <div className="va-claims-section">
          <h3 className="va-section-title">
            Claims ({results.claims.length})
          </h3>
          <div className="va-claims-list">
            {results.claims.map((claim, i) => (
              <ClaimCard key={i} claim={claim} />
            ))}
          </div>
        </div>
      )}

      {/* Perspectives */}
      {hasPerspectives && (
        <Collapsible title="Perspectives">
          <div className="va-perspectives-grid">
            {results.perspectives.left && (
              <div className="va-perspective">
                <span className="va-perspective-label">Left</span>
                <p className="va-perspective-text">
                  {results.perspectives.left}
                </p>
              </div>
            )}
            {results.perspectives.center && (
              <div className="va-perspective">
                <span className="va-perspective-label">Center</span>
                <p className="va-perspective-text">
                  {results.perspectives.center}
                </p>
              </div>
            )}
            {results.perspectives.right && (
              <div className="va-perspective">
                <span className="va-perspective-label">Right</span>
                <p className="va-perspective-text">
                  {results.perspectives.right}
                </p>
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* Bias Analysis — always visible */}
      <div className="card va-bias-card">
        <h3 className="va-bias-title">Bias Analysis</h3>
        <div className="va-bias-header">
          <span
            className={`va-bias-badge ${biasColor(results.bias_analysis.overall_bias)}`}
          >
            {results.bias_analysis.overall_bias}
          </span>
        </div>
        {results.bias_analysis.manipulation_tactics.length > 0 && (
          <div className="va-tactics">
            <span className="va-tactics-label">Tactics detected:</span>
            <div className="va-tactics-tags">
              {results.bias_analysis.manipulation_tactics.map((t, i) => (
                <span key={i} className="va-tactic-tag">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button className="btn btn-primary va-reset-btn" onClick={onReset}>
        Analyze Another
      </button>
    </div>
  );
}
