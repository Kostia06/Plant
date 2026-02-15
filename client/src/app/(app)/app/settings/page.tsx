"use client";

import Link from "next/link";

const SETTINGS_ITEMS = [
  { href: "/app/screen-time", label: "Screen Time", icon: "[%]", description: "View daily app usage" },
  { href: "/app/app-lock", label: "App Lock", icon: "[!]", description: "Lock distracting apps" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl text-deep-forest">Settings</h2>

      <div className="card">
        <h3 className="card-title">Plant Guard</h3>
        <p className="card-subtitle">Screen time monitoring and app controls</p>
        <div className="flex flex-col gap-2 mt-3">
          {SETTINGS_ITEMS.map(({ href, label, icon, description }) => (
            <Link key={href} href={href} className="leaderboard-row">
              <span className="px-icon menu-icon">{icon}</span>
              <span className="flex flex-col gap-0.5">
                <span>{label}</span>
                <span className="text-weathered-stone" style={{ fontSize: "9px" }}>{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
