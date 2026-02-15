"use client";

import { useState, useEffect } from "react";
import { PlantGuardCard } from "@/components/plant-guard";
import MindBloomDisplay from "@/components/MindBloomDisplay";
import { loadState, type PlantMinutesState } from "@/lib/plant-age";
import Link from "next/link";

export default function DashboardPage() {
  const [plantState, setPlantState] = useState<PlantMinutesState>(loadState());
  const [devScoreOffset, setDevScoreOffset] = useState(0);
  const [showDevControls, setShowDevControls] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlantState(loadState());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentTotalScore = plantState.totalLifetimeEarned + devScoreOffset;

  return (
    <div className="page-container">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "56px 1fr 56px",
          alignItems: "center",
          marginBottom: 16,
          position: "relative",
        }}
      >
        <button
          onClick={() => setShowDevControls((prev) => !prev)}
          className="btn btn-sm text-xl md:text-base leading-none min-w-[44px] min-h-[44px] md:min-w-[36px] md:min-h-[36px]"
          aria-label="Toggle Dev Controls"
        >
          🐛
        </button>

        <h1 className="text-2xl font-bold text-deep-forest text-center font-pixel">MINDBLOOM</h1>

        <div style={{ position: "relative", justifySelf: "end" }}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="btn btn-sm text-xl md:text-base leading-none min-w-[44px] min-h-[44px] md:min-w-[36px] md:min-h-[36px]"
            aria-label="Open quick menu"
          >
            ☰
          </button>

          {menuOpen && (
            <div
              className="card"
              style={{
                position: "absolute",
                right: 0,
                top: 48,
                zIndex: 20,
                minWidth: 190,
                padding: "0.5rem",
              }}
            >
              <Link
                href="/settings/lock-gate"
                className="btn-link"
                style={{ display: "block", marginTop: 0, marginBottom: 6 }}
                onClick={() => setMenuOpen(false)}
              >
                🔒 Lock Gate
              </Link>
              <Link
                href="/settings/progress"
                className="btn-link"
                style={{ display: "block", marginTop: 0 }}
                onClick={() => setMenuOpen(false)}
              >
                📊 Daily Progress
              </Link>
            </div>
          )}
        </div>
      </div>

      <section className="mb-6">
        <div className="w-full overflow-hidden">
          <MindBloomDisplay currentScore={currentTotalScore} />
        </div>
      </section>

      <section className="dash-actions">
        <Link href="/settings/lock-gate" className="btn btn-primary dash-action-btn">
          Lock Gate
        </Link>
        <Link href="/settings/reflections" className="btn btn-primary dash-action-btn">
          Reflect
        </Link>
        <Link href="/teasers" className="btn btn-primary dash-action-btn">
          Brain Teasers
        </Link>
        <Link href="/analyze" className="btn btn-primary dash-action-btn">
          Analyze Video
        </Link>
        <Link href="/settings/progress" className="btn btn-primary dash-action-btn dash-action-btn--secondary">
          Daily Progress
        </Link>
      </section>

      <div className="my-6">
        <PlantGuardCard />
      </div>

      {showDevControls && (
        <div className="card" style={{ maxWidth: "100%", overflow: "hidden" }}>
          <div className="text-center" style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            DEV CONTROLS (Test Visuals)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
            <button onClick={() => setDevScoreOffset((s) => s - 50)} className="btn btn-sm" style={{ background: "#fecaca", color: "#991b1b", fontSize: "10px" }}>-50 Pts</button>
            <button onClick={() => setDevScoreOffset((s) => s + 50)} className="btn btn-sm" style={{ background: "#bbf7d0", color: "#166534", fontSize: "10px" }}>+50 Pts</button>
            <button onClick={() => setDevScoreOffset((s) => s + 200)} className="btn btn-sm" style={{ background: "#bfdbfe", color: "#1e40af", fontSize: "10px" }}>+200 Pts</button>
            <button onClick={() => setDevScoreOffset(0)} className="btn btn-sm" style={{ background: "#fed7aa", color: "#9a3412", fontSize: "10px" }}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
