"use client";

import { useState, useEffect } from "react";
import { PlantGuardCard } from "@/components/plant-guard";
import MindBloomDisplay from "@/components/MindBloomDisplay"; // New Visuals
import { loadState, type PlantMinutesState, getDisplayAge } from "@/lib/plant-age";
import Link from "next/link";

export default function DashboardPage() {
  const [plantState, setPlantState] = useState<PlantMinutesState>(loadState());
  const [devScoreOffset, setDevScoreOffset] = useState(0);

  // Temporary local state for testing checks (mocking changes)

  useEffect(() => {
    const interval = setInterval(() => {
      setPlantState(loadState());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const ageDisplay = getDisplayAge(plantState.totalLifetimeEarned);
  const currentTotalScore = plantState.totalLifetimeEarned + devScoreOffset;

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-4 text-deep-forest text-center font-pixel">MINDBLOOM</h1>

      {/* Plant Section - Using New Visuals */}
      <section className="mb-6">
        <div className="w-full">
          {/* Using the new MindBloom Component */}
          <MindBloomDisplay currentScore={currentTotalScore} />
        </div>
      </section>

      <section className="dash-actions">
        <Link href="/settings/lock-gate" className="btn btn-primary dash-action-btn">
          🔒 Lock Gate
        </Link>
        <Link href="/settings/earn" className="btn btn-primary dash-action-btn">
          🌱 Earn Minutes
        </Link>
        <Link href="/settings/progress" className="btn btn-primary dash-action-btn dash-action-btn--secondary">
          📊 Daily Progress
        </Link>
      </section>

      <div className="my-6">
        <PlantGuardCard />
      </div>

      {/* DEV CONTROLS (Temporary - for testing animations) */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2 w-full bg-zinc-100 p-4 rounded-lg border border-zinc-300">
        <div className="col-span-full mb-1 text-center text-zinc-500 text-xs font-mono">DEV CONTROLS (Test Visuals)</div>
        <button onClick={() => setDevScoreOffset(s => s - 50)} className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded hover:bg-red-300">-50 Pts (Wither)</button>
        <button onClick={() => setDevScoreOffset(s => s + 50)} className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded hover:bg-green-300">+50 Pts</button>
        <button onClick={() => setDevScoreOffset(s => s + 200)} className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded hover:bg-blue-300">+200 Pts (Boost)</button>
        <button onClick={() => setDevScoreOffset(0)} className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded hover:bg-orange-300">Reset Offset</button>
      </div>
    </div>
  );
}
