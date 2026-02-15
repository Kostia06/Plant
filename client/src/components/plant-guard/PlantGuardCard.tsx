"use client";

import Link from "next/link";

export function PlantGuardCard() {
  return (
    <div className="card pg-card">
      <div className="pg-card-header">
        <span className="px-icon">[~]</span>
        <h2 className="card-title">Plant Guard</h2>
      </div>
      <p className="card-subtitle">
        Monitor your screen time and lock distracting apps
      </p>

      <div className="pg-card-actions">
        <Link href="/app/screen-time" className="btn btn-primary pg-card-btn">
          [%] Screen Time
        </Link>
        <Link href="/app/app-lock" className="btn btn-accept pg-card-btn">
          [!] App Lock
        </Link>
      </div>
    </div>
  );
}
