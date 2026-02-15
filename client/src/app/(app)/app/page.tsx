"use client";

import { PlantGuardCard } from "@/components/plant-guard";

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl text-deep-forest">Dashboard</h2>
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-twig bg-moss-wash">
        <p className="text-sm text-lichen">Tree visualization coming soon</p>
      </div>
      <PlantGuardCard />
    </div>
  );
}
