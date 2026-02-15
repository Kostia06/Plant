"use client";

import { useState, useEffect } from "react";
import { PlantGuardCard } from "@/components/plant-guard";
import { PlantSprite } from "@/components/plant-view/PlantSprite";
import { PlantAgeDisplay } from "@/components/plant-view/PlantAgeDisplay";
import { loadState, type PlantMinutesState, getDisplayAge, getPlantStage } from "@/lib/plant-age";
import Link from "next/link";

export default function DashboardPage() {
  const [plantState, setPlantState] = useState<PlantMinutesState>(loadState());

  useEffect(() => {
    // Refresh state periodically or on focus
    const interval = setInterval(() => {
      setPlantState(loadState());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const ageDisplay = getDisplayAge(plantState.totalLifetimeEarned);
  const stage = getPlantStage(plantState.totalLifetimeEarned);

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-4 text-deep-forest">Dashboard</h1>

      {/* Plant Section */}
      <section className="dash-plant-section">
        <PlantSprite stage={stage} size="lg" />
        <PlantAgeDisplay
          age={ageDisplay}
          balance={plantState.balance}
          totalLifetimeEarned={plantState.totalLifetimeEarned}
        />
      </section>

      {/* Quick Actions */}
      <section className="dash-actions">
        <Link href="/app/lock-gate" className="btn btn-primary dash-action-btn">
          🔒 Lock Gate
        </Link>
        <Link href="/app/earn" className="btn btn-primary dash-action-btn">
          🌱 Earn Minutes
        </Link>
        <Link href="/app/progress" className="btn btn-primary dash-action-btn dash-action-btn--secondary">
          📊 Daily Progress
        </Link>
      </section>

      <div className="my-6">
        <PlantGuardCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Existing dashboard items could go here */}
      </div>
    </div>
  );
}
